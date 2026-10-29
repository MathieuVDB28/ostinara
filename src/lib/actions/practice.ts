"use server";

import { tErr } from "@/i18n/server";
import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { updateChallengeProgress } from "./challenges";
import { createActivity } from "./activities";
import { derivedProgressPercent } from "@/lib/song-progress";
import { getMyPrimaryInstrument } from "@/lib/instruments-server";
import type {
  SongBpmPoint,
  PracticeSession,
  PracticeSessionWithSong,
  CreatePracticeSessionInput,
  UpdatePracticeSessionInput,
  PracticeStats,
  PracticeSessionFilters,
  SongPracticeStats,
  Song,
  ChartData,
  HeatmapData,
  HeatmapDay,
  BpmProgressData,
  MoodDistribution,
  SongPracticeDistribution,
  SessionMood,
  SessionActivityMetadata,
  PracticeSessionExerciseEntry,
  Instrument,
} from "@/types";
import { syncBadges } from "@/lib/badges/sync";

/**
 * Le journal, par page.
 *
 * L'ecran chargeait 50 sessions d'un coup et n'offrait aucun moyen de
 * voir la 51e : au-dela, l'historique existait sans etre atteignable.
 * `offset` rend la suite accessible sans jamais tout descendre.
 */
export async function getPracticeSessions(
  filters?: PracticeSessionFilters,
  limit?: number,
  offset?: number
): Promise<PracticeSessionWithSong[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  let query = supabase
    .from("practice_sessions")
    .select(`
      *,
      song:songs(*),
      exercises:practice_session_exercises(*)
    `)
    .eq("user_id", user.id)
    .order("practiced_at", { ascending: false });

  if (filters?.songId) {
    query = query.eq("song_id", filters.songId);
  }
  if (filters?.startDate) {
    query = query.gte("practiced_at", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("practiced_at", filters.endDate);
  }
  if (filters?.mood) {
    query = query.eq("mood", filters.mood);
  }
  if (limit) {
    // `range` est inclusif des deux cotes, d'ou le -1.
    if (offset) query = query.range(offset, offset + limit - 1);
    else query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching practice sessions:", error);
    return [];
  }

  return data as PracticeSessionWithSong[];
}

export async function getPracticeSessionsBySong(
  songId: string
): Promise<PracticeSession[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("song_id", songId)
    .order("practiced_at", { ascending: false });

  if (error) {
    console.error("Error fetching practice sessions by song:", error);
    return [];
  }

  return data as PracticeSession[];
}

/**
 * La derniere session enregistree, morceau compris.
 *
 * Elle porte tout ce qu'il faut pour reprendre sans rien ressaisir : le
 * morceau, le tempo atteint et les sections travaillees. « Jouer »
 * ouvrait sur un selecteur vide alors que la reponse etait en base.
 */
export async function getLastPracticeSession(): Promise<PracticeSessionWithSong | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("practice_sessions")
    .select(`
      *,
      song:songs(*),
      exercises:practice_session_exercises(*)
    `)
    .eq("user_id", user.id)
    .order("practiced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching last practice session:", error);
    return null;
  }

  return (data as PracticeSessionWithSong | null) ?? null;
}

export async function getPracticeSession(
  id: string
): Promise<PracticeSessionWithSong | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("practice_sessions")
    .select(`
      *,
      song:songs(*),
      exercises:practice_session_exercises(*)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching practice session:", error);
    return null;
  }

  return data as PracticeSessionWithSong;
}

export async function createPracticeSession(
  input: CreatePracticeSessionInput
): Promise<{ success: boolean; error?: string; session?: PracticeSession }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const instrument = input.instrument ?? (await getMyPrimaryInstrument());

  // Ce qui vaut pour toute la session : instrument, date, ressenti, objectifs, notes.
  const shared = {
    user_id: user.id,
    instrument,
    practiced_at: input.practiced_at || new Date().toISOString(),
    mood: input.mood || null,
    energy_level: input.energy_level || null,
    sections_worked: input.sections_worked || [],
    session_goals: input.session_goals || null,
    goals_achieved: input.goals_achieved || false,
    notes: input.notes || null,
  };

  /*
   * Plusieurs morceaux : une ligne par morceau, reliees par un groupe.
   * Un seul : la ligne habituelle, sans groupe.
   */
  // Un tempo hors des bornes de la base (20-300) ferait echouer tout
  // l'enregistrement des exercices : on le laisse de cote.
  const exercises = (input.exercises ?? [])
    .filter((exercise) => exercise.duration_minutes > 0 && (exercise.exercise_id || exercise.name.trim()))
    .map((exercise) => ({
      ...exercise,
      bpm_achieved:
        exercise.bpm_achieved && exercise.bpm_achieved >= 20 && exercise.bpm_achieved <= 300
          ? exercise.bpm_achieved
          : undefined,
    }));
  const entries = (
    input.songs && (input.songs.length > 0 || exercises.length > 0)
      ? input.songs.filter((entry) => entry.duration_minutes > 0)
      : [{ song_id: input.song_id || null, duration_minutes: input.duration_minutes, bpm_achieved: input.bpm_achieved }]
  ).map((entry) => ({ ...entry }));

  /*
   * Le temps des exercices vit dans la ligne sans morceau : les totaux, la
   * serie et le calendrier le comptent comme avant. Les exercices s'y
   * rattachent ensuite, un par ligne de practice_session_exercises.
   */
  const exerciseMinutes = exercises.reduce((sum, exercise) => sum + exercise.duration_minutes, 0);
  if (exerciseMinutes > 0) {
    const free = entries.find((entry) => !entry.song_id);
    if (free) free.duration_minutes += exerciseMinutes;
    else entries.push({ song_id: null, duration_minutes: exerciseMinutes, bpm_achieved: undefined });
  }

  if (entries.length === 0) {
    return { success: false, error: await tErr("durationMin") };
  }

  const groupId = entries.length > 1 ? crypto.randomUUID() : null;

  const { data, error } = await supabase
    .from("practice_sessions")
    .insert(
      entries.map((entry) => ({
        ...shared,
        song_id: entry.song_id || null,
        duration_minutes: entry.duration_minutes,
        bpm_achieved: entry.bpm_achieved || null,
        session_group_id: groupId,
      }))
    )
    .select();

  if (error || !data || data.length === 0) {
    console.error("Error creating practice session:", error);
    return { success: false, error: await tErr("sessionSaveFailed") };
  }

  const rows = data as PracticeSession[];
  const freeRow = rows.find((row) => !row.song_id);
  if (freeRow && exercises.length > 0) {
    const { error: exercisesError } = await supabase.from("practice_session_exercises").insert(
      exercises.map((exercise) => ({
        practice_session_id: freeRow.id,
        exercise_id: exercise.exercise_id || null,
        exercise_name: exercise.name.trim() || null,
        exercise_category: exercise.category || null,
        duration_minutes: exercise.duration_minutes,
        bpm_achieved: exercise.bpm_achieved || null,
      }))
    );
    // La session est la, son temps aussi : on ne la perd pas pour le
    // detail des exercices.
    if (exercisesError) console.error("Error recording session exercises:", exercisesError);
    await recordExercisesProgress(supabase, user.id, exercises);
  }

  // Les amis voient la session dans leur feed, et en sont notifies. La
  // case de la modale decide ; sans elle, le reglage du profil.
  const share = input.share ?? (await getShareSessionsDefault());
  if (share) {
    await publishSessionActivity(supabase, groupId ?? rows[0].id, rows);
  }

  // Mettre à jour la progression des challenges actifs, une fois pour
  // toute la session.
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
  updateChallengeProgress(totalMinutes).catch(console.error);

  // La progression de chaque morceau suit son tempo, plus le curseur.
  const songIds = [...new Set(entries.map((entry) => entry.song_id).filter((id): id is string => Boolean(id)))];
  await Promise.all(songIds.map((songId) => syncSongProgressFromTempo(songId, instrument)));

  revalidatePath("/progress");
  revalidatePath("/library");
  revalidatePath("/jouer");
  revalidatePath("/biblio");
  // Un morceau, une session, un album… peuvent debloquer un badge.
  await syncBadges();
  return { success: true, session: data[0] as PracticeSession };
}

/**
 * Le choix par defaut de la case « Partager avec mes amis » : le reglage
 * du profil (Profil > Reglages), vrai tant qu'on n'y a pas touche.
 */
export async function getShareSessionsDefault(): Promise<boolean> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return true;

  const { data } = await supabase
    .from("profile_private")
    .select("share_sessions")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.share_sessions !== false;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Ce que les amis voient d'une session : un instantane de ses lignes et
 * de ses morceaux. Les sessions sont privees (RLS) : le feed ne peut pas
 * les relire, il lit l'activite.
 */
async function sessionActivityMetadata(
  supabase: SupabaseClient,
  rows: PracticeSession[]
): Promise<SessionActivityMetadata> {
  const first = rows[0];
  const songIds = [...new Set(rows.map((row) => row.song_id).filter((id): id is string => Boolean(id)))];
  const { data: songs } = songIds.length
    ? await supabase.from("songs").select("id, title, artist, cover_url").in("id", songIds)
    : { data: [] };
  const songsById = new Map((songs ?? []).map((song) => [song.id, song]));
  const { data: exercises } = await supabase
    .from("practice_session_exercises")
    .select("exercise_id, exercise_name, exercise_category, duration_minutes, bpm_achieved")
    .in("practice_session_id", rows.map((row) => row.id))
    .order("created_at");

  return {
    instrument: (first.instrument ?? (await getMyPrimaryInstrument())) as Instrument,
    duration_minutes: rows.reduce((sum, row) => sum + row.duration_minutes, 0),
    practiced_at: first.practiced_at,
    mood: first.mood,
    energy_level: first.energy_level,
    sections_worked: first.sections_worked ?? [],
    session_goals: first.session_goals,
    goals_achieved: first.goals_achieved,
    notes: first.notes,
    // Le morceau le plus travaille d'abord : c'est lui que la notification nomme.
    songs: rows
      .filter((row) => row.song_id && songsById.has(row.song_id))
      .sort((a, b) => b.duration_minutes - a.duration_minutes)
      .map((row) => {
        const song = songsById.get(row.song_id!)!;
        return {
          id: song.id,
          title: song.title,
          artist: song.artist,
          cover_url: song.cover_url ?? null,
          minutes: row.duration_minutes,
          bpm: row.bpm_achieved,
        };
      }),
    exercises: (exercises ?? []).map((exercise) => ({
      id: exercise.exercise_id,
      name: exercise.exercise_name ?? "",
      category: exercise.exercise_category,
      minutes: exercise.duration_minutes,
      bpm: exercise.bpm_achieved,
    })),
  };
}

/**
 * La progression de chaque exercice joue (fiche seulement : un exo express
 * n'a rien a faire progresser). Le temps et le nombre de sessions avancent
 * toujours ; le tempo, seulement s'il a ete note.
 */
async function recordExercisesProgress(
  supabase: SupabaseClient,
  userId: string,
  exercises: PracticeSessionExerciseEntry[]
): Promise<void> {
  const byId = new Map<string, { minutes: number; bpm: number | null }>();
  for (const exercise of exercises) {
    if (!exercise.exercise_id) continue;
    const current = byId.get(exercise.exercise_id) ?? { minutes: 0, bpm: null };
    current.minutes += exercise.duration_minutes;
    if (exercise.bpm_achieved) current.bpm = Math.max(current.bpm ?? 0, exercise.bpm_achieved);
    byId.set(exercise.exercise_id, current);
  }
  if (byId.size === 0) return;

  const { data: existing } = await supabase
    .from("user_exercises")
    .select("*")
    .eq("user_id", userId)
    .in("exercise_id", [...byId.keys()]);
  const existingById = new Map((existing ?? []).map((row) => [row.exercise_id as string, row]));
  const now = new Date().toISOString();

  const { error } = await supabase.from("user_exercises").upsert(
    [...byId].map(([exerciseId, played]) => {
      const row = existingById.get(exerciseId);
      return {
        user_id: userId,
        exercise_id: exerciseId,
        // Sans tempo note, on garde le dernier connu (60 par defaut en base).
        current_bpm: played.bpm ?? row?.current_bpm ?? 60,
        best_bpm: Math.max(row?.best_bpm ?? 0, played.bpm ?? row?.best_bpm ?? 60),
        total_practice_minutes: (row?.total_practice_minutes ?? 0) + played.minutes,
        sessions_count: (row?.sessions_count ?? 0) + 1,
        last_practiced_at: now,
      };
    }),
    { onConflict: "user_id,exercise_id" }
  );

  if (error) console.error("Error updating exercise progress:", error);
}

/**
 * L'activite d'une session. `key` est le groupe de la session s'il y en a
 * un (plusieurs morceaux), sinon l'id de sa ligne.
 */
async function publishSessionActivity(
  supabase: SupabaseClient,
  key: string,
  rows: PracticeSession[]
): Promise<void> {
  const metadata = await sessionActivityMetadata(supabase, rows);
  await createActivity({
    type: "session_completed",
    reference_id: key,
    metadata: metadata as unknown as Record<string, unknown>,
  });
}

/**
 * Apres une correction ou une suppression : l'activite reprend les chiffres
 * de la session, ou disparait avec elle. Ne notifie personne une seconde
 * fois, et ne cree rien pour une session qui n'etait pas partagee.
 */
async function refreshSessionActivity(
  supabase: SupabaseClient,
  userId: string,
  key: string
): Promise<void> {
  const { data: rows } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("user_id", userId)
    .or(`id.eq.${key},session_group_id.eq.${key}`);

  if (!rows || rows.length === 0) {
    await supabase
      .from("activities")
      .delete()
      .eq("user_id", userId)
      .eq("type", "session_completed")
      .eq("reference_id", key);
    return;
  }

  const metadata = await sessionActivityMetadata(supabase, rows as PracticeSession[]);
  const { error } = await supabase
    .from("activities")
    .update({ metadata })
    .eq("user_id", userId)
    .eq("type", "session_completed")
    .eq("reference_id", key);

  if (error) console.error("Error refreshing session activity:", error);
}

/**
 * Reecrit `songs.progress_percent` a partir du meilleur tempo tenu.
 *
 * La colonne reste — le profil public, les favoris et le tri s'en servent —
 * mais elle cesse d'etre saisie a la main. Elle devient la lecture en
 * pourcentage d'une mesure reelle : le chemin parcouru entre le travail
 * lent et la cible.
 *
 * Sans cible connue, on ne touche a rien : ecrire 0 effacerait la valeur
 * historique sans rien dire de plus juste.
 */
export async function syncSongProgressFromTempo(
  songId: string,
  instrument?: Instrument | null
): Promise<{ success: boolean; percent?: number }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return { success: false };

  /*
   * Par instrument : le tempo tenu a la batterie ne dit rien de la partie
   * de guitare. La progression s'ecrit sur la partie (song_parts), la
   * base en tire la synthese sur songs.
   */
  const part = instrument ?? (await getMyPrimaryInstrument());

  const { data: song } = await supabase
    .from("songs")
    .select("id, target_bpm, tab_bpm, spotify_bpm, parts:song_parts(instrument, status, progress_percent)")
    .eq("id", songId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!song) return { success: false };

  const current = (song.parts as { instrument: Instrument; status: Song["status"]; progress_percent: number }[] | null)
    ?.find((row) => row.instrument === part);

  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("bpm_achieved")
    .eq("user_id", user.id)
    .eq("song_id", songId)
    .eq("instrument", part)
    .not("bpm_achieved", "is", null)
    .order("bpm_achieved", { ascending: false })
    .limit(1);

  const bestBpm = sessions?.[0]?.bpm_achieved ?? null;
  const percent = derivedProgressPercent(
    { ...song, status: current?.status ?? "want_to_learn" },
    bestBpm
  );

  if (percent === null || percent === current?.progress_percent) {
    return { success: true, percent: current?.progress_percent };
  }

  // Premiere session sur cet instrument : la partie nait ici, encore
  // « à apprendre » — le statut reste une decision du musicien.
  await supabase
    .from("song_parts")
    .upsert(
      { song_id: songId, user_id: user.id, instrument: part, progress_percent: percent },
      { onConflict: "song_id,instrument" }
    );

  return { success: true, percent };
}

/**
 * La courbe BPM/temps d'un morceau.
 *
 * Un point par session ou un tempo a ete note, du plus ancien au plus
 * recent. C'est la seule representation honnete de « ou j'en suis » :
 * elle monte, elle plafonne, elle redescend apres deux semaines sans
 * toucher l'instrument — un curseur « 60 % » ne fait aucun des trois.
 */
export async function getSongBpmProgress(
  songId: string,
  instrument?: Instrument | null
): Promise<SongBpmPoint[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return [];

  // Un instrument a la fois : le tempo a la batterie n'est pas celui de la guitare.
  let query = supabase
    .from("practice_sessions")
    .select("practiced_at, bpm_achieved")
    .eq("user_id", user.id)
    .eq("song_id", songId)
    .not("bpm_achieved", "is", null);
  if (instrument) query = query.eq("instrument", instrument);

  const { data, error } = await query.order("practiced_at", { ascending: true });

  if (error || !data) {
    if (error) console.error("Error fetching song BPM progress:", error);
    return [];
  }

  return data.map((row) => ({
    date: row.practiced_at,
    bpm: row.bpm_achieved as number,
  }));
}

export async function updatePracticeSession(
  id: string,
  input: UpdatePracticeSessionInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { data: updated, error } = await supabase
    .from("practice_sessions")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("instrument, session_group_id")
    .single();

  if (error) {
    console.error("Error updating practice session:", error);
    return { success: false, error: await tErr("updateFailed") };
  }

  // Les amis voient la session corrigee, pas l'ancienne.
  await refreshSessionActivity(supabase, user.id, updated?.session_group_id ?? id);

  // Corriger un tempo a la baisse doit corriger la progression du morceau,
  // sur l'instrument de la session.
  if (input.song_id) {
    await syncSongProgressFromTempo(input.song_id, updated?.instrument as Instrument | null);
  }

  revalidatePath("/progress");
  revalidatePath("/library");
  revalidatePath("/jouer");
  return { success: true };
}

/**
 * Corrige une session a plusieurs morceaux d'un bloc : le temps et le tempo
 * de chaque morceau, les lignes retirees, et ce qui est commun a la session
 * (date, humeur, notes…), recopie sur chaque ligne comme a la creation.
 */
export async function updatePracticeSessionGroup(
  groupId: string,
  input: {
    rows: { id: string; duration_minutes: number; bpm_achieved: number | null }[];
    removed: string[];
    shared: Omit<UpdatePracticeSessionInput, "song_id" | "duration_minutes" | "bpm_achieved">;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }
  if (input.rows.length === 0 || input.rows.some((row) => !(row.duration_minutes >= 1))) {
    return { success: false, error: await tErr("updateFailed") };
  }

  if (input.removed.length > 0) {
    const { error } = await supabase
      .from("practice_sessions")
      .delete()
      .in("id", input.removed)
      .eq("user_id", user.id)
      .eq("session_group_id", groupId);
    if (error) {
      console.error("Error removing practice session rows:", error);
      return { success: false, error: await tErr("updateFailed") };
    }
  }

  const now = new Date().toISOString();
  const results = await Promise.all(
    input.rows.map((row) =>
      supabase
        .from("practice_sessions")
        .update({
          ...input.shared,
          duration_minutes: row.duration_minutes,
          bpm_achieved: row.bpm_achieved,
          updated_at: now,
        })
        .eq("id", row.id)
        .eq("user_id", user.id)
        .eq("session_group_id", groupId)
        .select("song_id, instrument")
        .single()
    )
  );

  const failed = results.find((result) => result.error);
  if (failed) {
    console.error("Error updating practice session group:", failed.error);
    return { success: false, error: await tErr("updateFailed") };
  }

  // Les amis voient la session corrigee, pas l'ancienne.
  await refreshSessionActivity(supabase, user.id, groupId);

  // Un tempo corrige corrige la progression du morceau, sur l'instrument joue.
  await Promise.all(
    results.flatMap(({ data }) =>
      data?.song_id ? [syncSongProgressFromTempo(data.song_id, data.instrument as Instrument | null)] : []
    )
  );

  revalidatePath("/progress");
  revalidatePath("/library");
  revalidatePath("/jouer");
  return { success: true };
}

export async function deletePracticeSession(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: await tErr("notAuthenticated") };
  }

  const { data: deleted, error } = await supabase
    .from("practice_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("session_group_id")
    .maybeSingle();

  if (error) {
    console.error("Error deleting practice session:", error);
    return { success: false, error: await tErr("deleteFailed") };
  }

  // Une session effacee quitte le feed ; une ligne d'une session a
  // plusieurs morceaux en sort seule.
  await refreshSessionActivity(supabase, user.id, deleted?.session_group_id ?? id);

  revalidatePath("/progress");
  revalidatePath("/library");
  return { success: true };
}

export async function getPracticeStats(): Promise<PracticeStats> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  const defaultStats: PracticeStats = {
    totalSessions: 0,
    totalMinutes: 0,
    averageSessionLength: 0,
    sessionsThisWeek: 0,
    minutesThisWeek: 0,
    currentStreak: 0,
    longestStreak: 0,
    mostPracticedSong: null,
  };

  if (!user) {
    return defaultStats;
  }

  /*
   * Les stats ont besoin de toutes les sessions — un total, une moyenne
   * et une serie ne se calculent pas sur une page. Mais elles n'ont besoin
   * que de trois colonnes : `*, song:songs(*)` joignait la ligne complete
   * de chaque morceau a chaque session, pour ne garder au final qu'un
   * seul morceau, le plus pratique.
   */
  const { data: sessions, error } = await supabase
    .from("practice_sessions")
    .select("id, practiced_at, duration_minutes, song_id, session_group_id")
    .eq("user_id", user.id)
    .order("practiced_at", { ascending: false });

  if (error || !sessions || sessions.length === 0) {
    return defaultStats;
  }

  // Stats de base. Une session a plusieurs morceaux tient sur plusieurs
  // lignes : elle compte pour une.
  const sessionKey = (s: { id: string; session_group_id: string | null }) =>
    s.session_group_id ?? s.id;
  const totalSessions = new Set(sessions.map(sessionKey)).size;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const averageSessionLength = Math.round(totalMinutes / totalSessions);

  // Sessions cette semaine
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const sessionsThisWeek = sessions.filter(
    s => new Date(s.practiced_at) >= startOfWeek
  );
  const minutesThisWeek = sessionsThisWeek.reduce(
    (sum, s) => sum + s.duration_minutes, 0
  );

  // Calculer le streak (jours consécutifs de pratique)
  const uniqueDays = [...new Set(
    sessions.map(s => new Date(s.practiced_at).toDateString())
  )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < uniqueDays.length; i++) {
    const dayDate = new Date(uniqueDays[i]);
    dayDate.setHours(0, 0, 0, 0);

    if (i === 0) {
      // Vérifier si la première date est aujourd'hui ou hier
      const diffDays = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) {
        tempStreak = 1;
        currentStreak = 1;
      } else {
        // Streak cassé, on ne compte que pour le longest
        tempStreak = 1;
      }
    } else {
      const prevDate = new Date(uniqueDays[i - 1]);
      prevDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((prevDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        if (i < uniqueDays.length && currentStreak > 0) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  /*
   * Morceau le plus pratique : on compte sur les identifiants, puis on lit
   * la ligne du gagnant. Une requete de plus, mais une seule — contre une
   * jointure sur chaque session dont on jetait 99 % du resultat.
   */
  const countBySong = new Map<string, number>();
  for (const session of sessions) {
    if (!session.song_id) continue;
    countBySong.set(session.song_id, (countBySong.get(session.song_id) ?? 0) + 1);
  }

  let winnerId: string | null = null;
  let winnerCount = 0;
  for (const [songId, count] of countBySong) {
    if (count > winnerCount) {
      winnerId = songId;
      winnerCount = count;
    }
  }

  let mostPracticedSong: { song: Song; count: number } | null = null;
  if (winnerId) {
    const { data: song } = await supabase
      .from("songs")
      .select("*")
      .eq("id", winnerId)
      .maybeSingle();
    // Le morceau a pu etre supprime alors que ses sessions restent.
    if (song) mostPracticedSong = { song: song as Song, count: winnerCount };
  }

  return {
    totalSessions,
    totalMinutes,
    averageSessionLength,
    sessionsThisWeek: new Set(sessionsThisWeek.map(sessionKey)).size,
    minutesThisWeek,
    currentStreak,
    longestStreak,
    mostPracticedSong,
  };
}

export async function getSongPracticeStats(songId: string): Promise<SongPracticeStats> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  const defaultStats: SongPracticeStats = {
    totalSessions: 0,
    totalMinutes: 0,
    lastPracticed: null,
    averageBpm: null,
    bestBpm: null,
  };

  if (!user) {
    return defaultStats;
  }

  const { data: sessions, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("song_id", songId)
    .order("practiced_at", { ascending: false });

  if (error || !sessions || sessions.length === 0) {
    return defaultStats;
  }

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const lastPracticed = sessions[0].practiced_at;

  // Calculer les stats BPM
  const sessionsWithBpm = sessions.filter(s => s.bpm_achieved !== null);
  let averageBpm: number | null = null;
  let bestBpm: number | null = null;

  if (sessionsWithBpm.length > 0) {
    const totalBpm = sessionsWithBpm.reduce((sum, s) => sum + s.bpm_achieved!, 0);
    averageBpm = Math.round(totalBpm / sessionsWithBpm.length);
    bestBpm = Math.max(...sessionsWithBpm.map(s => s.bpm_achieved!));
  }

  return {
    totalSessions,
    totalMinutes,
    lastPracticed,
    averageBpm,
    bestBpm,
  };
}

/**
 * Les stats de pratique de tous les morceaux, en une passe.
 *
 * La page "Jouer" appelait getSongPracticeStats() une fois par morceau :
 * a 80 morceaux en bibliotheque, 80 clients Supabase, 80 verifications
 * d'identite et 80 allers-retours avant le premier pixel. Ici, une seule
 * lecture et l'agregation en memoire.
 */
export async function getAllSongPracticeStats(): Promise<
  Record<string, SongPracticeStats>
> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return {};
  }

  type StatsRow = Pick<
    PracticeSession,
    "song_id" | "duration_minutes" | "practiced_at" | "bpm_achieved"
  >;

  // PostgREST plafonne une reponse a 1000 lignes. Sans pagination, le
  // journal d'un utilisateur assidu serait tronque au bout de trois ans
  // environ — silencieusement, sans erreur.
  const PAGE_SIZE = 1000;
  const rows: StatsRow[] = [];

  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("practice_sessions")
      .select("song_id, duration_minutes, practiced_at, bpm_achieved")
      .eq("user_id", user.id)
      .not("song_id", "is", null)
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching song practice stats:", error);
      return {};
    }

    if (!data || data.length === 0) break;
    rows.push(...(data as StatsRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  const stats: Record<string, SongPracticeStats> = {};
  // La moyenne a besoin de sa propre somme : les sessions sans BPM ne
  // doivent compter ni au numerateur ni au denominateur.
  const bpm: Record<string, { sum: number; count: number }> = {};

  for (const row of rows) {
    const songId = row.song_id;
    if (!songId) continue;

    const entry = (stats[songId] ??= {
      totalSessions: 0,
      totalMinutes: 0,
      lastPracticed: null,
      averageBpm: null,
      bestBpm: null,
    });

    entry.totalSessions += 1;
    entry.totalMinutes += row.duration_minutes;

    if (
      !entry.lastPracticed ||
      new Date(row.practiced_at) > new Date(entry.lastPracticed)
    ) {
      entry.lastPracticed = row.practiced_at;
    }

    if (row.bpm_achieved !== null) {
      const accumulator = (bpm[songId] ??= { sum: 0, count: 0 });
      accumulator.sum += row.bpm_achieved;
      accumulator.count += 1;
      entry.bestBpm = Math.max(entry.bestBpm ?? 0, row.bpm_achieved);
    }
  }

  for (const [songId, accumulator] of Object.entries(bpm)) {
    stats[songId].averageBpm = Math.round(accumulator.sum / accumulator.count);
  }

  return stats;
}

// Configuration des moods pour les graphiques
const MOOD_CONFIG: Record<SessionMood, { emoji: string; color: string }> = {
  frustrated: { emoji: "😤", color: "#ef4444" },
  neutral: { emoji: "😐", color: "#6b7280" },
  good: { emoji: "🙂", color: "#22c55e" },
  great: { emoji: "😊", color: "#3b82f6" },
  on_fire: { emoji: "🔥", color: "#f97316" },
};

// Helper pour formater une date en YYYY-MM-DD local (sans conversion UTC)
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * @param instrument Les stats d'un seul instrument ; absent : tous. La
 * repartition par instrument porte toujours sur toutes les sessions.
 */
export async function getChartData(daysBack: number = 365, instrument?: Instrument | null): Promise<ChartData> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  const defaultData: ChartData = {
    heatmap: { days: [], maxMinutes: 0, totalDays: daysBack, activeDays: 0 },
    bpmProgress: [],
    moodDistribution: [],
    songDistribution: [],
  };

  if (!user) {
    return defaultData;
  }

  // Calculer la date de début
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  startDate.setHours(0, 0, 0, 0);

  // Récupérer toutes les sessions avec les morceaux
  const { data: sessions, error } = await supabase
    .from("practice_sessions")
    .select("*, song:songs(*)")
    .eq("user_id", user.id)
    .gte("practiced_at", startDate.toISOString())
    .order("practiced_at", { ascending: true });

  if (error || !sessions) {
    console.error("Error fetching sessions for charts:", error);
    return defaultData;
  }

  const minutesByInstrument = new Map<Instrument, number>();
  for (const session of sessions) {
    if (!session.instrument) continue;
    const key = session.instrument as Instrument;
    minutesByInstrument.set(key, (minutesByInstrument.get(key) ?? 0) + session.duration_minutes);
  }
  const instrumentDistribution = [...minutesByInstrument.entries()]
    .map(([key, minutes]) => ({ instrument: key, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const scoped = instrument ? sessions.filter((session) => session.instrument === instrument) : sessions;

  // Générer les données
  const heatmap = generateHeatmapData(scoped, daysBack);
  const bpmProgress = generateBpmProgressData(scoped);
  const moodDistribution = generateMoodDistribution(scoped);
  const songDistribution = generateSongDistribution(scoped);

  return {
    heatmap,
    bpmProgress,
    moodDistribution,
    songDistribution,
    instrumentDistribution,
  };
}

/**
 * Le calendrier de pratique seul, pour le Carnet de « Jouer ».
 *
 * getChartData calcule aussi les courbes de tempo et les repartitions,
 * et joint chaque morceau : trop pour une grille de 15 semaines. Ici, deux
 * colonnes et le meme calcul de niveaux que l'onglet Statistiques.
 */
export async function getPracticeCalendar(daysBack: number = 105): Promise<HeatmapData> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  const empty: HeatmapData = { days: [], maxMinutes: 0, totalDays: daysBack, activeDays: 0 };
  if (!user) return empty;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("practiced_at, duration_minutes")
    .eq("user_id", user.id)
    .gte("practiced_at", startDate.toISOString());

  if (error || !data) {
    console.error("Error fetching practice calendar:", error);
    return empty;
  }

  // generateHeatmapData ne lit que ces deux colonnes.
  return generateHeatmapData(data as PracticeSessionWithSong[], daysBack);
}

function generateHeatmapData(
  sessions: PracticeSessionWithSong[],
  daysBack: number
): HeatmapData {
  // Créer un map date -> données (utiliser date locale)
  const dayMap = new Map<string, { minutes: number; sessions: number }>();

  sessions.forEach((session) => {
    const date = formatDateLocal(new Date(session.practiced_at));
    const existing = dayMap.get(date) || { minutes: 0, sessions: 0 };
    existing.minutes += session.duration_minutes;
    existing.sessions += 1;
    dayMap.set(date, existing);
  });

  // Calculer le max pour les niveaux
  const maxMinutes = Math.max(
    ...Array.from(dayMap.values()).map((d) => d.minutes),
    1
  );

  // Générer tous les jours
  const days: HeatmapDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatDateLocal(date);
    const dayData = dayMap.get(dateStr) || { minutes: 0, sessions: 0 };

    // Calculer le niveau (0-4)
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (dayData.minutes > 0) {
      const ratio = dayData.minutes / maxMinutes;
      if (ratio <= 0.25) level = 1;
      else if (ratio <= 0.5) level = 2;
      else if (ratio <= 0.75) level = 3;
      else level = 4;
    }

    days.push({
      date: dateStr,
      minutes: dayData.minutes,
      sessions: dayData.sessions,
      level,
    });
  }

  const activeDays = days.filter((d) => d.minutes > 0).length;

  return {
    days,
    maxMinutes,
    totalDays: daysBack,
    activeDays,
  };
}

function generateBpmProgressData(
  sessions: PracticeSessionWithSong[]
): BpmProgressData[] {
  // Grouper par morceau
  const songMap = new Map<
    string,
    {
      song: Song;
      sessions: Array<{ date: string; bpm: number }>;
    }
  >();

  sessions.forEach((session) => {
    if (!session.song_id || !session.song || !session.bpm_achieved) return;

    const existing = songMap.get(session.song_id) || {
      song: session.song,
      sessions: [],
    };
    existing.sessions.push({
      date: formatDateLocal(new Date(session.practiced_at)),
      bpm: session.bpm_achieved,
    });
    songMap.set(session.song_id, existing);
  });

  // Convertir en BpmProgressData, filtrer ceux avec au moins 2 points
  const result: BpmProgressData[] = [];

  songMap.forEach((data, songId) => {
    if (data.sessions.length < 2) return;

    // Trier par date
    data.sessions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const points = data.sessions.map((s) => ({
      date: s.date,
      bpm: s.bpm,
      songTitle: data.song.title,
    }));

    const bpms = data.sessions.map((s) => s.bpm);
    const bestBpm = Math.max(...bpms);
    const latestBpm = bpms[bpms.length - 1];
    const firstBpm = bpms[0];
    const improvement =
      firstBpm > 0 ? Math.round(((latestBpm - firstBpm) / firstBpm) * 100) : 0;

    result.push({
      songId,
      songTitle: data.song.title,
      songArtist: data.song.artist,
      coverUrl: data.song.cover_url,
      points,
      bestBpm,
      latestBpm,
      improvement,
    });
  });

  // Trier par nombre de points (les plus de données en premier)
  return result.sort((a, b) => b.points.length - a.points.length);
}

function generateMoodDistribution(
  sessions: PracticeSessionWithSong[]
): MoodDistribution[] {
  const moodCounts = new Map<SessionMood, number>();
  let totalWithMood = 0;

  sessions.forEach((session) => {
    if (session.mood) {
      moodCounts.set(session.mood, (moodCounts.get(session.mood) || 0) + 1);
      totalWithMood++;
    }
  });

  if (totalWithMood === 0) return [];

  const result: MoodDistribution[] = [];
  const moods: SessionMood[] = ["frustrated", "neutral", "good", "great", "on_fire"];

  moods.forEach((mood) => {
    const count = moodCounts.get(mood) || 0;
    if (count > 0) {
      const config = MOOD_CONFIG[mood];
      result.push({
        mood,
        count,
        percentage: Math.round((count / totalWithMood) * 100),
        emoji: config.emoji,
        color: config.color,
      });
    }
  });

  return result;
}

function generateSongDistribution(
  sessions: PracticeSessionWithSong[]
): SongPracticeDistribution[] {
  const songMap = new Map<
    string,
    {
      song: Song;
      totalMinutes: number;
      totalSessions: number;
    }
  >();

  let totalMinutesAll = 0;

  sessions.forEach((session) => {
    if (!session.song_id || !session.song) return;

    const existing = songMap.get(session.song_id) || {
      song: session.song,
      totalMinutes: 0,
      totalSessions: 0,
    };
    existing.totalMinutes += session.duration_minutes;
    existing.totalSessions += 1;
    totalMinutesAll += session.duration_minutes;
    songMap.set(session.song_id, existing);
  });

  if (totalMinutesAll === 0) return [];

  const result: SongPracticeDistribution[] = [];

  songMap.forEach((data, songId) => {
    result.push({
      songId,
      songTitle: data.song.title,
      songArtist: data.song.artist,
      coverUrl: data.song.cover_url,
      totalMinutes: data.totalMinutes,
      totalSessions: data.totalSessions,
      percentage: Math.round((data.totalMinutes / totalMinutesAll) * 100),
    });
  });

  // Trier par temps total (décroissant), limiter aux top 10
  return result.sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 10);
}
