import { NextResponse } from "next/server";
import { tErr } from "@/i18n/server";
import { requirePaidPlan } from "@/lib/actions/plan";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, parisDay } from "@/lib/streak";
import { createZip, toCsv } from "@/lib/zip";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Export des stats et des donnees (Pro) : un ZIP avec les stats de pratique
 * en CSV (resume, temps par morceau, par mois, par instrument, sessions,
 * morceaux, exercices) et tout ce qui appartient a la personne en JSON. Sans les fichiers
 * audio-video, et sans ce qui appartient aux autres (groupes, amis).
 * Tout est lu sous RLS avec le client de la personne.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: await tErr("notAuthenticated") }, { status: 401 });

  const plan = await requirePaidPlan();
  if (!plan.allowed) return NextResponse.json({ error: plan.error }, { status: 403 });

  const uid = user.id;
  const own = async (table: string, column = "user_id", select = "*") => {
    const rows: Record<string, unknown>[] = [];
    // Par pages de 1000, la limite de l'API.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select(select).eq(column, uid).range(from, from + 999);
      if (error) {
        console.error(`Export: error reading ${table}:`, error);
        break;
      }
      rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
      if (!data || data.length < 1000) break;
    }
    return rows;
  };

  const [
    profile,
    privateProfile,
    instruments,
    songs,
    parts,
    sessions,
    exercises,
    userExercises,
    setlists,
    covers,
    takes,
    gear,
    gearSetups,
    gearWishlist,
    albumReviews,
    albumWishlist,
    wishlist,
    favoriteSongs,
    favoriteAlbums,
    playlists,
    weeklyGoals,
    badges,
  ] = await Promise.all([
    own("profiles", "id", "id, username, display_name, bio, avatar_url, plan, is_private, instagram_url, tiktok_url, twitter_url, facebook_url, created_at"),
    own("profile_private", "user_id", "subscription_status, subscription_period_end, locale, practice_reminders, share_sessions"),
    own("profile_instruments"),
    own("songs"),
    own("song_parts"),
    own("practice_sessions", "user_id", "*, exercises:practice_session_exercises(*)"),
    own("exercises", "created_by"),
    own("user_exercises", "user_id", "*, exercise:exercises(name)"),
    own("setlists", "user_id", "*, items:setlist_items(*)"),
    own("covers", "user_id", "id, song_id, media_type, duration_seconds, file_size_bytes, visibility, description, created_at"),
    own("song_takes", "user_id", "id, song_id, instrument, title, note, media_type, duration_seconds, file_size_bytes, recorded_at"),
    own("gear_items", "user_id", "*, details:gear_item_private(*)"),
    own("gear_setups", "user_id", "*, items:gear_setup_items(*)"),
    own("gear_wishlist"),
    own("album_reviews"),
    own("album_wishlist"),
    own("wishlist_songs"),
    own("favorite_songs"),
    own("favorite_albums"),
    own("playlists", "user_id", "*, songs:playlist_songs(*)"),
    own("weekly_goals"),
    own("user_badges"),
  ]);

  const songTitle = new Map(songs.map((song) => [song.id as string, `${song.title}${song.artist ? ` - ${song.artist}` : ""}`]));
  const exportedAt = new Date();
  const data = {
    exported_at: exportedAt.toISOString(),
    profile: { ...(profile[0] ?? {}), ...(privateProfile[0] ?? {}) },
    instruments,
    songs: songs.map((song) => ({ ...song, parts: parts.filter((part) => part.song_id === song.id) })),
    practice_sessions: sessions,
    exercises_created: exercises,
    exercise_progress: userExercises,
    setlists,
    covers,
    song_takes: takes,
    gear,
    gear_setups: gearSetups,
    gear_wishlist: gearWishlist,
    album_reviews: albumReviews,
    album_wishlist: albumWishlist,
    song_wishlist: wishlist,
    favorite_songs: favoriteSongs,
    favorite_albums: favoriteAlbums,
    playlists,
    weekly_goals: weeklyGoals,
    badges,
  };

  const sessionsCsv = toCsv(
    ["date", "duree_minutes", "morceau", "instrument", "bpm", "humeur", "energie", "sections", "objectif", "notes"],
    sessions.map((row) => [
      row.practiced_at,
      row.duration_minutes,
      row.song_id ? songTitle.get(row.song_id as string) ?? "" : "",
      row.instrument,
      row.bpm_achieved,
      row.mood,
      row.energy_level,
      row.sections_worked,
      row.session_goals,
      row.notes,
    ])
  );
  const songsCsv = toCsv(
    ["titre", "artiste", "album", "statut", "progression", "instrument", "statut_instrument", "progression_instrument", "tempo_cible", "objectif_bpm", "objectif_date", "accordage", "capo", "ajoute_le"],
    songs.flatMap((song) => {
      const songParts = parts.filter((part) => part.song_id === song.id);
      const base = [song.title, song.artist, song.album, song.status, song.progress_percent];
      const tail = [song.target_bpm, null, null, song.tuning, song.capo_position, song.created_at];
      if (songParts.length === 0) return [[...base, null, null, null, ...tail]];
      return songParts.map((part) => [
        ...base,
        part.instrument,
        part.status,
        part.progress_percent,
        song.target_bpm,
        part.goal_bpm,
        part.goal_date,
        song.tuning,
        song.capo_position,
        song.created_at,
      ]);
    })
  );
  const exercisesCsv = toCsv(
    ["exercice", "bpm_actuel", "meilleur_bpm", "minutes", "seances", "derniere_fois"],
    userExercises.map((row) => [
      (row.exercise as { name?: string } | null)?.name ?? "",
      row.current_bpm,
      row.best_bpm,
      row.total_practice_minutes,
      row.sessions_count,
      row.last_practiced_at,
    ])
  );

  // Les stats : memes regles que l'app (jours de Paris, computeStreak).
  const minutes = (row: Record<string, unknown>) => Number(row.duration_minutes) || 0;
  const totalMinutes = sessions.reduce((sum, row) => sum + minutes(row), 0);
  const days = sessions.map((row) => parisDay(row.practiced_at as string));
  const streak = computeStreak(days);
  const sumBy = (key: (row: Record<string, unknown>) => string | null) => {
    const map = new Map<string, { minutes: number; sessions: number }>();
    for (const row of sessions) {
      const k = key(row);
      if (!k) continue;
      const entry = map.get(k) ?? { minutes: 0, sessions: 0 };
      entry.minutes += minutes(row);
      entry.sessions += 1;
      map.set(k, entry);
    }
    return map;
  };
  const bySong = sumBy((row) => (row.song_id ? (row.song_id as string) : null));
  const byMonth = sumBy((row) => parisDay(row.practiced_at as string).slice(0, 7));
  const byInstrument = sumBy((row) => (row.instrument as string | null) ?? null);
  const bestBpmBySong = new Map<string, number>();
  for (const row of sessions) {
    if (row.song_id && row.bpm_achieved) {
      const id = row.song_id as string;
      bestBpmBySong.set(id, Math.max(bestBpmBySong.get(id) ?? 0, Number(row.bpm_achieved)));
    }
  }
  const topSong = [...bySong.entries()].sort((a, b) => b[1].minutes - a[1].minutes)[0];
  const sortedDays = [...new Set(days)].sort();

  const summaryCsv = toCsv(
    ["indicateur", "valeur"],
    [
      ["sessions", sessions.length],
      ["minutes_totales", totalMinutes],
      ["heures_totales", Math.round((totalMinutes / 60) * 10) / 10],
      ["jours_joues", sortedDays.length],
      ["premiere_session", sortedDays[0] ?? ""],
      ["derniere_session", sortedDays[sortedDays.length - 1] ?? ""],
      ["serie_actuelle_jours", streak.current],
      ["plus_longue_serie_jours", streak.longest],
      ["morceaux", songs.length],
      ["morceaux_maitrises", songs.filter((song) => song.status === "mastered").length],
      ["morceau_le_plus_joue", topSong ? songTitle.get(topSong[0]) ?? "" : ""],
      ["covers", covers.length],
      ["prises", takes.length],
    ]
  );
  const perSongCsv = toCsv(
    ["morceau", "minutes", "sessions", "meilleur_bpm"],
    [...bySong.entries()]
      .sort((a, b) => b[1].minutes - a[1].minutes)
      .map(([id, entry]) => [songTitle.get(id) ?? "", entry.minutes, entry.sessions, bestBpmBySong.get(id) ?? ""])
  );
  const perMonthCsv = toCsv(
    ["mois", "minutes", "sessions"],
    [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, entry]) => [month, entry.minutes, entry.sessions])
  );
  const perInstrumentCsv = toCsv(
    ["instrument", "minutes", "sessions"],
    [...byInstrument.entries()].sort((a, b) => b[1].minutes - a[1].minutes).map(([instrument, entry]) => [instrument, entry.minutes, entry.sessions])
  );

  const day = exportedAt.toISOString().slice(0, 10);
  const zip = createZip(
    [
      { name: "ostinara/stats/resume.csv", content: summaryCsv },
      { name: "ostinara/stats/temps-par-morceau.csv", content: perSongCsv },
      { name: "ostinara/stats/temps-par-mois.csv", content: perMonthCsv },
      { name: "ostinara/stats/temps-par-instrument.csv", content: perInstrumentCsv },
      { name: "ostinara/sessions.csv", content: sessionsCsv },
      { name: "ostinara/morceaux.csv", content: songsCsv },
      { name: "ostinara/exercices.csv", content: exercisesCsv },
      { name: "ostinara/donnees.json", content: JSON.stringify(data, null, 2) },
    ],
    exportedAt
  );

  return new NextResponse(new Blob([zip as BlobPart], { type: "application/zip" }), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ostinara-export-${day}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
