"use server";

import { getTranslations } from "next-intl/server";
import { tErr } from "@/i18n/server";
import type { Translator } from "@/i18n/types";
import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { songTargetBpm, nextTempoStep } from "@/lib/song-progress";
import { measure, type MeasureInput } from "@/lib/weekly-plan-measure";
import type {
  PracticeSession,
  Song,
  SongSection,
  WeeklyGoal,
  WeeklyGoalWithProgress,
  WeeklyPlan,
} from "@/types";
import { syncBadges } from "@/lib/badges/sync";

/**
 * Le plan de la semaine.
 *
 * L'app enregistrait le passe sans jamais proposer la suite. Trois
 * objectifs, generes le lundi a partir de ce que la base sait deja :
 * le statut des morceaux, le meilleur tempo tenu, la serie en cours et
 * les sections travaillees sans succes.
 *
 * Regle de conception : un objectif doit etre mesurable par le journal.
 * Cocher reste possible — c'est un geste, pas la source de verite.
 */

/** Nombre d'objectifs par semaine. Trois : une semaine, pas une liste de courses. */
const GOALS_PER_WEEK = 3;

/** La marche de tempo proposee quand on vise un morceau. */
const TEMPO_STEP = 8;

/** Les objectifs sont ecrits en base dans la langue de l'utilisateur au moment de la generation. */
type PlanT = Translator<"weeklyPlan">;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Date locale en YYYY-MM-DD — jamais de conversion UTC, elle decale le lundi. */
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Le lundi de la semaine courante.
 *
 * `getDay()` rend 0 pour dimanche : sans le cas particulier, un dimanche
 * soir tomberait sur le lundi suivant et ouvrirait une semaine vide a six
 * jours de distance.
 */
function startOfWeek(reference = new Date()): Date {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  const weekday = date.getDay();
  const shift = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + shift);
  return date;
}

function endOfWeek(weekStart: Date): Date {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

type GoalDraft = Omit<
  WeeklyGoal,
  "id" | "user_id" | "week_start" | "completed_at" | "created_at"
>;

interface GenerationInput {
  songs: Song[];
  /** Meilleur tempo tenu par morceau, tous temps confondus. */
  bestBpm: Map<string, number>;
  /** Sections travaillees dans une session dont l'objectif n'a pas ete atteint. */
  weakSections: Map<string, SongSection>;
  /** Minutes jouees la semaine derniere. */
  lastWeekMinutes: number;
  /** Jours distincts joues la semaine derniere. */
  lastWeekDays: number;
  /** Morceaux deja en cours, pour ne pas en proposer un quatrieme. */
  learningCount: number;
  coversCount: number;
}

/**
 * Trois objectifs, choisis dans un ordre de priorite.
 *
 * L'ordre compte : un plan qui commence par « joue 180 minutes » ne dit
 * rien de la guitare. On part de ce qu'on travaille — un morceau, un
 * tempo — et on ne tombe sur les objectifs de volume que faute de mieux.
 */
function buildGoals(input: GenerationInput, t: PlanT): GoalDraft[] {
  const {
    songs,
    bestBpm,
    weakSections,
    lastWeekMinutes,
    lastWeekDays,
    learningCount,
    coversCount,
  } = input;

  const drafts: GoalDraft[] = [];
  const usedSongIds = new Set<string>();

  const learning = songs.filter((song) => song.status === "learning");

  // 1. Le tempo : le morceau en cours le plus proche de sa cible sans
  //    l'avoir atteinte. C'est la marche la plus courte, donc la plus
  //    susceptible d'etre franchie cette semaine.
  const tempoCandidates = learning
    .map((song) => {
      const target = songTargetBpm(song);
      if (!target) return null;
      const best = bestBpm.get(song.id) ?? 0;
      if (best >= target.bpm) return null;
      return { song, target: target.bpm, best, gap: target.bpm - best };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      candidate !== null
    )
    .sort((a, b) => a.gap - b.gap);

  const tempo = tempoCandidates[0];
  if (tempo) {
    // On ne demande pas la cible finale : on demande la prochaine marche.
    const step = Math.min(
      tempo.target,
      tempo.best > 0
        ? nextTempoStep(tempo.best, tempo.target, TEMPO_STEP)
        : tempo.target
    );
    drafts.push({
      kind: "tempo",
      title: t("goal.tempoTitle", { title: tempo.song.title, step }),
      detail:
        tempo.best > 0
          ? t("goal.tempoBest", { best: tempo.best, target: tempo.target })
          : t("goal.tempoNone", { target: tempo.target }),
      song_id: tempo.song.id,
      target_value: step,
      baseline_value: tempo.best,
      unit: "BPM",
      position: drafts.length,
    });
    usedSongIds.add(tempo.song.id);
  }

  // 2. La section faible : un passage travaille sans que l'objectif de la
  //    session soit atteint. C'est la seule trace de difficulte que le
  //    journal enregistre.
  for (const song of learning) {
    if (usedSongIds.has(song.id)) continue;
    const section = weakSections.get(song.id);
    if (!section) continue;
    drafts.push({
      kind: "section",
      title: t("goal.sectionTitle", { section: t(`section.${section}`), title: song.title }),
      detail: t("goal.sectionDetail"),
      song_id: song.id,
      target_value: 2,
      baseline_value: 0,
      unit: "sessions",
      position: drafts.length,
    });
    usedSongIds.add(song.id);
    break;
  }

  // 3. La maitrise : un morceau en cours qui a atteint sa cible de tempo
  //    n'attend plus qu'un changement de statut.
  if (drafts.length < GOALS_PER_WEEK) {
    const ready = learning.find((song) => {
      if (usedSongIds.has(song.id)) return false;
      const target = songTargetBpm(song);
      const best = bestBpm.get(song.id);
      return Boolean(target && best && best >= target.bpm);
    });
    if (ready) {
      drafts.push({
        kind: "mastery",
        title: t("goal.masteryTitle", { title: ready.title }),
        detail: t("goal.masteryDetail"),
        song_id: ready.id,
        target_value: 1,
        baseline_value: 0,
        unit: null,
        position: drafts.length,
      });
      usedSongIds.add(ready.id);
    }
  }

  // 4. Sortir un morceau de la file d'attente, quand on n'en travaille
  //    qu'un ou aucun et qu'il y a de quoi piocher. Ce qu'un pont a
  //    ajoute (un album, un ami) passe devant : c'est l'envie du moment.
  if (drafts.length < GOALS_PER_WEEK && learningCount < 3) {
    const queued = songs
      .filter((song) => song.status === "want_to_learn" && !usedSongIds.has(song.id))
      .sort((a, b) => {
        const byOrigin = Number(Boolean(b.added_from)) - Number(Boolean(a.added_from));
        return byOrigin || b.created_at.localeCompare(a.created_at);
      })[0];
    if (queued) {
      drafts.push({
        kind: "song_start",
        title: t("goal.startTitle", { title: queued.title }),
        detail: songStartDetail(queued, t),
        song_id: queued.id,
        target_value: 1,
        baseline_value: 0,
        unit: null,
        position: drafts.length,
      });
      usedSongIds.add(queued.id);
    }
  }

  // 5. La regularite : un jour de plus que la semaine derniere, plafonne
  //    a cinq. Un objectif de serie qui demande sept jours se casse le
  //    mardi et ne se repare jamais.
  if (drafts.length < GOALS_PER_WEEK) {
    const days = Math.min(5, Math.max(3, lastWeekDays + 1));
    drafts.push({
      kind: "days",
      title: t("goal.daysTitle", { days }),
      detail:
        lastWeekDays > 0
          ? t("goal.daysLast", { count: lastWeekDays })
          : t("goal.daysNone"),
      song_id: null,
      target_value: days,
      baseline_value: 0,
      unit: "days",
      position: drafts.length,
    });
  }

  // 6. Une cover, quand il n'y en a encore aucune : c'est le geste qui
  //    fait exister le cote social de l'app.
  if (drafts.length < GOALS_PER_WEEK && coversCount === 0) {
    drafts.push({
      kind: "cover",
      title: t("goal.coverTitle"),
      detail: t("goal.coverDetail"),
      song_id: null,
      target_value: 1,
      baseline_value: 0,
      unit: null,
      position: drafts.length,
    });
  }

  // 7. Le volume, en dernier recours : ce n'est pas un objectif de
  //    guitariste, c'est un objectif de compteur.
  while (drafts.length < GOALS_PER_WEEK) {
    const minutes = Math.max(60, Math.round((lastWeekMinutes * 1.1) / 15) * 15);
    drafts.push({
      kind: "minutes",
      title: t("goal.minutesTitle", { minutes }),
      detail:
        lastWeekMinutes > 0
          ? t("goal.minutesLast", { minutes: lastWeekMinutes })
          : t("goal.minutesNone"),
      song_id: null,
      target_value: minutes,
      baseline_value: 0,
      unit: "min",
      position: drafts.length,
    });
  }

  return drafts.slice(0, GOALS_PER_WEEK);
}

/** Pourquoi ce morceau-la : son origine, quand un pont l'a ajoute. */
function songStartDetail(song: Song, t: PlanT): string {
  switch (song.added_from) {
    case "album":
      return song.added_from_label
        ? t("goal.fromAlbum", { label: song.added_from_label })
        : t("goal.fromArtist", { artist: song.artist ?? "" });
    case "friend":
      return song.added_from_label ? t("goal.fromFriend", { label: song.added_from_label }) : t("goal.fromSomeFriend");
    default:
      return t("goal.waiting", { artist: song.artist ?? "" });
  }
}

// ---------------------------------------------------------------------------
// Mesure
// ---------------------------------------------------------------------------

/**
 * Le pourcentage affiche.
 *
 * Pour un objectif de tempo, la barre part du meilleur tempo connu au
 * moment de la generation : sinon, passer de 88 a 96 BPM afficherait 92 %
 * des le premier jour et ne bougerait presque plus.
 */
function percentOf(goal: WeeklyGoal, current: number): number {
  const target = goal.target_value ?? 1;
  const baseline = goal.kind === "tempo" ? goal.baseline_value ?? 0 : 0;
  const span = Math.max(1, target - baseline);
  return Math.min(100, Math.max(0, Math.round(((current - baseline) / span) * 100)));
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

/**
 * Le plan de la semaine, genere s'il n'existe pas encore.
 *
 * La generation est faite ici et non par un cron : un plan n'a de sens
 * qu'a partir du moment ou on ouvre l'app, et un cron sur toute la base
 * ecrirait des plans pour des comptes dormants.
 */
export async function getWeeklyPlan(): Promise<WeeklyPlan | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const weekStartDate = startOfWeek();
  const weekStart = formatDateLocal(weekStartDate);
  const weekEndDate = endOfWeek(weekStartDate);

  let { data: goals } = await supabase
    .from("weekly_goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .order("position", { ascending: true });

  if (!goals || goals.length === 0) {
    goals = await generateGoalsFor(user.id, weekStart, weekStartDate);
  }

  if (!goals || goals.length === 0) {
    return { weekStart, weekEnd: formatDateLocal(weekEndDate), goals: [], completedCount: 0 };
  }

  // Les mesures : une lecture des sessions de la semaine, une des tempos,
  // une des morceaux vises, une des covers. Quatre requetes, pas une par
  // objectif.
  const songIds = [...new Set(goals.map((g) => g.song_id).filter(Boolean))] as string[];

  const [sessionsResult, bestBpmMap, goalSongs, coversResult] = await Promise.all([
    supabase
      .from("practice_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("practiced_at", weekStartDate.toISOString())
      .lte("practiced_at", weekEndDate.toISOString()),
    bestBpmBySong(user.id, songIds),
    fetchSongs(songIds),
    supabase
      .from("covers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekStartDate.toISOString()),
  ]);

  const weekSessions = (sessionsResult.data ?? []) as PracticeSession[];
  const songsMap = new Map<string, Song>(
    goalSongs.map((song) => [song.id, song])
  );
  const weekCovers = coversResult.count ?? 0;

  const measureInput: MeasureInput = {
    weekSessions,
    bestBpm: bestBpmMap,
    songs: songsMap,
    weekCovers,
  };

  const withProgress: WeeklyGoalWithProgress[] = (goals as WeeklyGoal[]).map(
    (goal) => {
      const current = measure(goal, measureInput);
      const target = goal.target_value ?? 1;
      const checked = goal.completed_at !== null;
      return {
        ...goal,
        song: goal.song_id ? songsMap.get(goal.song_id) ?? null : null,
        current,
        percent: percentOf(goal, current),
        done: checked || current >= target,
        checked,
      };
    }
  );

  return {
    weekStart,
    weekEnd: formatDateLocal(weekEndDate),
    goals: withProgress,
    completedCount: withProgress.filter((goal) => goal.done).length,
  };
}

/** Les morceaux vises par les objectifs. Liste vide : aucune requete. */
async function fetchSongs(songIds: string[]): Promise<Song[]> {
  if (songIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("songs").select("*").in("id", songIds);
  return (data ?? []) as Song[];
}

/** Meilleur `bpm_achieved` par morceau, pour la liste demandee. */
async function bestBpmBySong(
  userId: string,
  songIds: string[]
): Promise<Map<string, number>> {
  const best = new Map<string, number>();
  if (songIds.length === 0) return best;

  const supabase = await createClient();
  const { data } = await supabase
    .from("practice_sessions")
    .select("song_id, bpm_achieved")
    .eq("user_id", userId)
    .in("song_id", songIds)
    .not("bpm_achieved", "is", null);

  for (const row of data ?? []) {
    if (!row.song_id || row.bpm_achieved === null) continue;
    best.set(row.song_id, Math.max(best.get(row.song_id) ?? 0, row.bpm_achieved));
  }
  return best;
}

/**
 * Ecrit les trois objectifs de la semaine.
 *
 * L'insertion passe par `upsert` sur (user_id, week_start, position) :
 * deux onglets ouverts un lundi matin ne doivent pas produire six lignes.
 */
async function generateGoalsFor(
  userId: string,
  weekStart: string,
  weekStartDate: Date
): Promise<WeeklyGoal[]> {
  const supabase = await createClient();

  const previousWeekStart = new Date(weekStartDate);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const [songsResult, sessionsResult, coversResult] = await Promise.all([
    supabase.from("songs").select("*").eq("user_id", userId),
    // Tout le journal serait de trop : on a besoin des tempos (toutes
    // periodes) et de la semaine passee. Une seule lecture, bornee aux
    // colonnes utiles.
    supabase
      .from("practice_sessions")
      .select("song_id, bpm_achieved, duration_minutes, practiced_at, sections_worked, goals_achieved")
      .eq("user_id", userId)
      .order("practiced_at", { ascending: false })
      .limit(500),
    supabase
      .from("covers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const songs = (songsResult.data ?? []) as Song[];
  const sessions = (sessionsResult.data ?? []) as Pick<
    PracticeSession,
    | "song_id"
    | "bpm_achieved"
    | "duration_minutes"
    | "practiced_at"
    | "sections_worked"
    | "goals_achieved"
  >[];

  const bestBpm = new Map<string, number>();
  const weakSections = new Map<string, SongSection>();
  let lastWeekMinutes = 0;
  const lastWeekDays = new Set<string>();

  for (const session of sessions) {
    if (session.song_id && session.bpm_achieved !== null) {
      bestBpm.set(
        session.song_id,
        Math.max(bestBpm.get(session.song_id) ?? 0, session.bpm_achieved)
      );
    }

    // Une section « faible » est une section travaillee lors d'une session
    // dont l'objectif n'a pas ete atteint. Les sessions sont lues de la
    // plus recente a la plus ancienne : le premier trouve est le bon.
    if (
      session.song_id &&
      !session.goals_achieved &&
      session.sections_worked?.length &&
      !weakSections.has(session.song_id)
    ) {
      const section = session.sections_worked.find((s) => s !== "full_song");
      if (section) weakSections.set(session.song_id, section);
    }

    const practicedAt = new Date(session.practiced_at);
    if (practicedAt >= previousWeekStart && practicedAt < weekStartDate) {
      lastWeekMinutes += session.duration_minutes;
      lastWeekDays.add(formatDateLocal(practicedAt));
    }
  }

  const drafts = buildGoals({
    songs,
    bestBpm,
    weakSections,
    lastWeekMinutes,
    lastWeekDays: lastWeekDays.size,
    learningCount: songs.filter((song) => song.status === "learning").length,
    coversCount: coversResult.count ?? 0,
  }, await getTranslations("weeklyPlan"));

  const { data, error } = await supabase
    .from("weekly_goals")
    .upsert(
      drafts.map((draft) => ({
        ...draft,
        user_id: userId,
        week_start: weekStart,
      })),
      { onConflict: "user_id,week_start,position", ignoreDuplicates: true }
    )
    .select();

  if (error) {
    console.error("Error generating weekly goals:", error);
    return [];
  }

  // `ignoreDuplicates` renvoie une liste vide quand un autre onglet a
  // gagne la course : on relit ce qui a ete ecrit.
  if (!data || data.length === 0) {
    const { data: existing } = await supabase
      .from("weekly_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .order("position", { ascending: true });
    return (existing ?? []) as WeeklyGoal[];
  }

  return (data as WeeklyGoal[]).sort((a, b) => a.position - b.position);
}

// ---------------------------------------------------------------------------
// Ecriture
// ---------------------------------------------------------------------------

/** Coche ou decoche un objectif. La mesure, elle, continue sa vie. */
export async function toggleWeeklyGoal(
  goalId: string
): Promise<{ success: boolean; completed?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const { data: goal } = await supabase
    .from("weekly_goals")
    .select("completed_at")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!goal) return { success: false, error: await tErr("goalNotFound") };

  const completed = goal.completed_at === null;

  const { error } = await supabase
    .from("weekly_goals")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error toggling weekly goal:", error);
    return { success: false, error: await tErr("updateFailed") };
  }

  revalidatePath("/jouer");
  revalidatePath("/profil");
  // Un morceau, une session, un album… peuvent debloquer un badge.
  await syncBadges();
  return { success: true, completed };
}

/**
 * Rejoue la generation pour la semaine en cours.
 *
 * Utile quand la bibliotheque a change apres coup — un morceau ajoute le
 * mardi n'a aucune raison d'attendre le lundi suivant pour compter.
 */
export async function regenerateWeeklyPlan(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  const weekStartDate = startOfWeek();
  const weekStart = formatDateLocal(weekStartDate);

  const { error } = await supabase
    .from("weekly_goals")
    .delete()
    .eq("user_id", user.id)
    .eq("week_start", weekStart);

  if (error) {
    console.error("Error clearing weekly goals:", error);
    return { success: false, error: await tErr("regenerateFailed") };
  }

  await generateGoalsFor(user.id, weekStart, weekStartDate);

  revalidatePath("/jouer");
  revalidatePath("/profil");
  return { success: true };
}

/**
 * Un morceau tout juste repere entre dans le plan de la semaine en cours.
 *
 * Le plan est genere le lundi : sans ce pont, un morceau ajoute depuis un
 * album le mardi attendrait six jours pour etre propose. Il devient un
 * objectif « Attaquer X » en plus des trois — une seule fois par semaine,
 * et pas tant qu'un autre « Attaquer » attend encore d'etre commence.
 */
export async function suggestSongThisWeek(song: Song): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return;

  const weekStart = formatDateLocal(startOfWeek());

  const { data: goals } = await supabase
    .from("weekly_goals")
    .select("kind, position, song_id, completed_at")
    .eq("user_id", user.id)
    .eq("week_start", weekStart);

  // Pas encore de plan : il sera genere a l'ouverture, avec ce morceau
  // en tete de la file (cf. buildGoals, etape 4).
  if (!goals || goals.length === 0) return;
  if (goals.length > GOALS_PER_WEEK) return;

  const pendingStarts = goals.filter((goal) => goal.kind === "song_start" && !goal.completed_at);
  if (pendingStarts.length > 0) {
    const ids = pendingStarts.map((goal) => goal.song_id).filter(Boolean) as string[];
    const { data: waiting } = await supabase
      .from("songs")
      .select("id")
      .in("id", ids)
      .eq("status", "want_to_learn")
      .limit(1);
    if (waiting && waiting.length > 0) return;
  }

  const position = Math.max(...goals.map((goal) => goal.position)) + 1;
  const tp = await getTranslations("weeklyPlan");
  const { error } = await supabase.from("weekly_goals").insert({
    user_id: user.id,
    week_start: weekStart,
    kind: "song_start",
    title: tp("goal.startTitle", { title: song.title }),
    detail: songStartDetail(song, tp),
    song_id: song.id,
    target_value: 1,
    baseline_value: 0,
    unit: null,
    position,
  });

  if (error) {
    console.error("Error adding song to weekly plan:", error);
    return;
  }

  revalidatePath("/jouer");
  revalidatePath("/accueil");
}
