"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateChallengeProgress } from "./challenges";
import type {
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
} from "@/types";

export async function getPracticeSessions(
  filters?: PracticeSessionFilters,
  limit?: number
): Promise<PracticeSessionWithSong[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let query = supabase
    .from("practice_sessions")
    .select(`
      *,
      song:songs(*)
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
    query = query.limit(limit);
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
  const { data: { user } } = await supabase.auth.getUser();

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

export async function getPracticeSession(
  id: string
): Promise<PracticeSessionWithSong | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("practice_sessions")
    .select(`
      *,
      song:songs(*)
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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { data, error } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: user.id,
      song_id: input.song_id || null,
      duration_minutes: input.duration_minutes,
      practiced_at: input.practiced_at || new Date().toISOString(),
      bpm_achieved: input.bpm_achieved || null,
      mood: input.mood || null,
      energy_level: input.energy_level || null,
      sections_worked: input.sections_worked || [],
      session_goals: input.session_goals || null,
      goals_achieved: input.goals_achieved || false,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating practice session:", error);
    return { success: false, error: "Erreur lors de l'enregistrement de la session" };
  }

  // Mettre à jour la progression des challenges actifs
  updateChallengeProgress(input.duration_minutes).catch(console.error);

  revalidatePath("/progress");
  revalidatePath("/library");
  return { success: true, session: data as PracticeSession };
}

export async function updatePracticeSession(
  id: string,
  input: UpdatePracticeSessionInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("practice_sessions")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating practice session:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/progress");
  revalidatePath("/library");
  return { success: true };
}

export async function deletePracticeSession(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("practice_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting practice session:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/progress");
  revalidatePath("/library");
  return { success: true };
}

export async function getPracticeStats(): Promise<PracticeStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  // Récupérer toutes les sessions
  const { data: sessions, error } = await supabase
    .from("practice_sessions")
    .select("*, song:songs(*)")
    .eq("user_id", user.id)
    .order("practiced_at", { ascending: false });

  if (error || !sessions || sessions.length === 0) {
    return defaultStats;
  }

  // Stats de base
  const totalSessions = sessions.length;
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

  // Morceau le plus pratiqué
  const songCounts = new Map<string, { song: Song; count: number }>();
  sessions.forEach(s => {
    if (s.song_id && s.song) {
      const existing = songCounts.get(s.song_id);
      if (existing) {
        existing.count++;
      } else {
        songCounts.set(s.song_id, { song: s.song as Song, count: 1 });
      }
    }
  });

  let mostPracticedSong: { song: Song; count: number } | null = null;
  songCounts.forEach(value => {
    if (!mostPracticedSong || value.count > mostPracticedSong.count) {
      mostPracticedSong = value;
    }
  });

  return {
    totalSessions,
    totalMinutes,
    averageSessionLength,
    sessionsThisWeek: sessionsThisWeek.length,
    minutesThisWeek,
    currentStreak,
    longestStreak,
    mostPracticedSong,
  };
}

export async function getSongPracticeStats(songId: string): Promise<SongPracticeStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

// Configuration des moods pour les graphiques
const MOOD_CONFIG: Record<SessionMood, { label: string; emoji: string; color: string }> = {
  frustrated: { label: "Frustré", emoji: "😤", color: "#ef4444" },
  neutral: { label: "Neutre", emoji: "😐", color: "#6b7280" },
  good: { label: "Bien", emoji: "🙂", color: "#22c55e" },
  great: { label: "Super", emoji: "😊", color: "#3b82f6" },
  on_fire: { label: "On fire", emoji: "🔥", color: "#f97316" },
};

// Helper pour formater une date en YYYY-MM-DD local (sans conversion UTC)
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getChartData(daysBack: number = 365): Promise<ChartData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  // Générer les données
  const heatmap = generateHeatmapData(sessions, daysBack);
  const bpmProgress = generateBpmProgressData(sessions);
  const moodDistribution = generateMoodDistribution(sessions);
  const songDistribution = generateSongDistribution(sessions);

  return {
    heatmap,
    bpmProgress,
    moodDistribution,
    songDistribution,
  };
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
        label: config.label,
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
