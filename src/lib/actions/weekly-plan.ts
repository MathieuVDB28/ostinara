"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { songTargetBpm, nextTempoStep } from "@/lib/song-progress";
import type {
  PracticeSession,
  Song,
  SongSection,
  WeeklyGoal,
  WeeklyGoalWithProgress,
  WeeklyPlan,
} from "@/types";

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

const SECTION_LABELS: Record<SongSection, string> = {
  intro: "l'intro",
  verse: "le couplet",
  chorus: "le refrain",
  bridge: "le pont",
  solo: "le solo",
  outro: "l'outro",
  full_song: "le morceau en entier",
};

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
function buildGoals(input: GenerationInput): GoalDraft[] {
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
      title: `Passer « ${tempo.song.title} » à ${step} BPM`,
      detail:
        tempo.best > 0
          ? `Meilleur tempo tenu : ${tempo.best} BPM · cible ${tempo.target}`
          : `Aucun tempo enregistré · cible ${tempo.target} BPM`,
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
      title: `Reprendre ${SECTION_LABELS[section]} de « ${song.title} »`,
      detail: "Ce passage est resté en travers la dernière fois",
      song_id: song.id,
      target_value: 2,
      baseline_value: 0,
      unit: "séances",
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
        title: `Boucler « ${ready.title} »`,
        detail: "Le tempo cible est tenu — passe-le en « maîtrisé »",
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
  //    qu'un ou aucun et qu'il y a de quoi piocher.
  if (drafts.length < GOALS_PER_WEEK && learningCount < 3) {
    const queued = songs.find(
      (song) => song.status === "want_to_learn" && !usedSongIds.has(song.id)
    );
    if (queued) {
      drafts.push({
        kind: "song_start",
        title: `Attaquer « ${queued.title} »`,
        detail: `${queued.artist} attend dans « À apprendre »`,
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
      title: `Jouer ${days} jours cette semaine`,
      detail:
        lastWeekDays > 0
          ? `La semaine dernière : ${lastWeekDays} jour${lastWeekDays > 1 ? "s" : ""}`
          : "Aucune session la semaine dernière — on repart doucement",
      song_id: null,
      target_value: days,
      baseline_value: 0,
      unit: "jours",
      position: drafts.length,
    });
  }

  // 6. Une cover, quand il n'y en a encore aucune : c'est le geste qui
  //    fait exister le cote social de l'app.
  if (drafts.length < GOALS_PER_WEEK && coversCount === 0) {
    drafts.push({
      kind: "cover",
      title: "Enregistrer ta première cover",
      detail: "Même approximative — c'est un repère, pas une performance",
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
      title: `${minutes} minutes de pratique`,
      detail:
        lastWeekMinutes > 0
          ? `La semaine dernière : ${lastWeekMinutes} min`
          : "Un premier repère pour la semaine",
      song_id: null,
      target_value: minutes,
      baseline_value: 0,
      unit: "min",
      position: drafts.length,
    });
  }

  return drafts.slice(0, GOALS_PER_WEEK);
}

// ---------------------------------------------------------------------------
// Mesure
// ---------------------------------------------------------------------------

interface MeasureInput {
  weekSessions: PracticeSession[];
  bestBpm: Map<string, number>;
  songs: Map<string, Song>;
  weekCovers: number;
}

/** Ce que le journal dit d'un objectif, independamment de la coche. */
function measure(goal: WeeklyGoal, input: MeasureInput): number {
  const { weekSessions, bestBpm, songs, weekCovers } = input;

  switch (goal.kind) {
    case "tempo":
      return goal.song_id ? bestBpm.get(goal.song_id) ?? 0 : 0;

    case "mastery":
      return goal.song_id && songs.get(goal.song_id)?.status === "mastered"
        ? 1
        : 0;

    case "song_start": {
      if (!goal.song_id) return 0;
      const status = songs.get(goal.song_id)?.status;
      return status === "learning" || status === "mastered" ? 1 : 0;
    }

    case "section":
      // Le detail ne porte pas la section : on compte les seances sur le
      // morceau, c'est la seule mesure honnete a notre portee.
      return weekSessions.filter((session) => session.song_id === goal.song_id)
        .length;

    case "minutes":
      return weekSessions.reduce(
        (total, session) => total + session.duration_minutes,
        0
      );

    case "days":
      return new Set(
        weekSessions.map((session) =>
          formatDateLocal(new Date(session.practiced_at))
        )
      ).size;

    case "cover":
      return weekCovers;

    default:
      return 0;
  }
}

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
  });

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
  if (!user) return { success: false, error: "Non authentifié" };

  const { data: goal } = await supabase
    .from("weekly_goals")
    .select("completed_at")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!goal) return { success: false, error: "Objectif introuvable" };

  const completed = goal.completed_at === null;

  const { error } = await supabase
    .from("weekly_goals")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error toggling weekly goal:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/jouer");
  revalidatePath("/profil");
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
  if (!user) return { success: false, error: "Non authentifié" };

  const weekStartDate = startOfWeek();
  const weekStart = formatDateLocal(weekStartDate);

  const { error } = await supabase
    .from("weekly_goals")
    .delete()
    .eq("user_id", user.id)
    .eq("week_start", weekStart);

  if (error) {
    console.error("Error clearing weekly goals:", error);
    return { success: false, error: "Erreur lors de la régénération" };
  }

  await generateGoalsFor(user.id, weekStart, weekStartDate);

  revalidatePath("/jouer");
  revalidatePath("/profil");
  return { success: true };
}
