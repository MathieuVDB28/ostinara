"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { createActivity } from "./activities";
import {
  findAlbum,
  getAlbumDetails,
  getArtistAlbums,
  getRelatedArtists,
  searchArtists,
} from "@/lib/services/deezer";
import { addSongToLibrary } from "./songs";
import type {
  AlbumReview,
  AlbumCommunityStats,
  WeeklyAlbum,
  WeeklyAlbums,
  CreateAlbumReviewInput,
  UpdateAlbumReviewInput,
  AlbumRecommendation,
  CatalogAlbumDetails,
  CatalogAlbumTrack,
  Song,
} from "@/types";
import { syncBadges } from "@/lib/badges/sync";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role credentials not configured");
  return createServiceRoleClient(url, key);
}

// === Créer une review d'album ===
export async function createAlbumReview(
  input: CreateAlbumReviewInput
): Promise<{ success: boolean; error?: string; data?: AlbumReview }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  if (input.rating < 0 || input.rating > 10) {
    return { success: false, error: "La note doit être entre 0 et 10" };
  }

  const { data, error } = await supabase
    .from("album_reviews")
    .insert({
      user_id: user.id,
      album_name: input.album_name,
      artist_name: input.artist_name,
      cover_url: input.cover_url || null,
      deezer_id: input.deezer_id || null,
      release_date: input.release_date || null,
      total_tracks: input.total_tracks || null,
      rating: input.rating,
      review: input.review || null,
      favorite_track_name: input.favorite_track_name || null,
      favorite_track_deezer_id: input.favorite_track_deezer_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating album review:", error);
    return { success: false, error: "Erreur lors de la création de la review" };
  }

  // Créer l'activité pour le feed
  await createActivity({
    type: "album_reviewed",
    reference_id: data.id,
    metadata: {
      album_name: input.album_name,
      artist_name: input.artist_name,
      cover_url: input.cover_url,
      rating: input.rating,
      review: input.review,
      favorite_track_name: input.favorite_track_name,
    },
  });

  revalidatePath("/albums");
  // Un morceau, une session, un album… peuvent debloquer un badge.
  await syncBadges();
  return { success: true, data: data as AlbumReview };
}

// === Récupérer les reviews de l'utilisateur ===
export async function getUserAlbumReviews(
  /** Sans limite, tout le mur d'albums. Avec, les N derniers ecoutes. */
  limit?: number
): Promise<AlbumReview[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return [];

  let query = supabase
    .from("album_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching album reviews:", error);
    return [];
  }

  return (data || []) as AlbumReview[];
}

// === Mettre à jour une review ===
export async function updateAlbumReview(
  reviewId: string,
  input: UpdateAlbumReviewInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  if (input.rating !== undefined && (input.rating < 0 || input.rating > 10)) {
    return { success: false, error: "La note doit être entre 0 et 10" };
  }

  const { error } = await supabase
    .from("album_reviews")
    .update(input)
    .eq("id", reviewId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating album review:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/albums");
  return { success: true };
}

// === Supprimer une review ===
export async function deleteAlbumReview(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("album_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting album review:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/albums");
  return { success: true };
}

// === Note moyenne communauté pour un album (tous utilisateurs, service role) ===
export async function getAlbumCommunityStats(deezerId: string): Promise<AlbumCommunityStats | null> {
  const supabase = getServiceRoleSupabase();

  const { data, error } = await supabase
    .from("album_reviews")
    .select("rating")
    .eq("deezer_id", deezerId);

  if (error || !data || data.length === 0) return null;

  const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  return { avg_rating: avg, review_count: data.length };
}

// === Notes communauté pour plusieurs albums (batch, pour la fiche artiste) ===
export async function getAlbumsCommunityStats(
  catalogIds: string[]
): Promise<Record<string, AlbumCommunityStats>> {
  if (catalogIds.length === 0) return {};

  const supabase = getServiceRoleSupabase();

  const { data, error } = await supabase
    .from("album_reviews")
    .select("deezer_id, rating")
    .in("deezer_id", catalogIds);

  if (error || !data) return {};

  const result: Record<string, { sum: number; count: number }> = {};
  for (const row of data) {
    if (!row.deezer_id) continue;
    if (!result[row.deezer_id]) result[row.deezer_id] = { sum: 0, count: 0 };
    result[row.deezer_id].sum += row.rating;
    result[row.deezer_id].count += 1;
  }

  const stats: Record<string, AlbumCommunityStats> = {};
  for (const [id, { sum, count }] of Object.entries(result)) {
    stats[id] = { avg_rating: sum / count, review_count: count };
  }
  return stats;
}

// === Albums de la semaine (toute la communauté, service role) ===

// Les semaines vont du lundi au dimanche, heure de Paris : celle des
// utilisateurs, pas celle du serveur (UTC sur Vercel).
const WEEK_TIME_ZONE = "Europe/Paris";

/** Combien de semaines en arriere on peut remonter. */
const MAX_WEEK_OFFSET = 52;

const parisFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WEEK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parisParts(date: Date) {
  const parts = Object.fromEntries(
    parisFormatter.formatToParts(date).map((part) => [part.type, Number(part.value)])
  );
  return parts as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

/** L'instant UTC de minuit, heure de Paris, pour une date calendaire. */
function parisMidnight(calendarDate: Date): Date {
  const guess = calendarDate.getTime();
  const p = parisParts(calendarDate);
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess;
  return new Date(guess - offset);
}

function toIsoDate(calendarDate: Date): string {
  return calendarDate.toISOString().slice(0, 10);
}

/** Lundi et dimanche (dates calendaires) et bornes UTC de la semaine. */
function weekBounds(weekOffset: number) {
  const today = parisParts(new Date());
  const monday = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const daysSinceMonday = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday - 7 * weekOffset);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);

  return {
    monday,
    sunday,
    start: parisMidnight(monday),
    end: parisMidnight(nextMonday),
  };
}

function normalizeAlbumKey(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

/**
 * Les albums ecoutes par la communaute pendant une semaine, avec la note
 * moyenne des ecoutes de cette semaine. Seuls des agregats sortent du
 * service role : ni noms ni critiques des autres utilisateurs.
 */
export async function getWeeklyAlbums(weekOffset = 0): Promise<WeeklyAlbums | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const offset = Math.min(Math.max(Math.trunc(weekOffset) || 0, 0), MAX_WEEK_OFFSET);
  const { monday, sunday, start, end } = weekBounds(offset);

  const empty: WeeklyAlbums = {
    week_start: toIsoDate(monday),
    week_end: toIsoDate(sunday),
    week_offset: offset,
    albums: [],
  };

  const supabase = getServiceRoleSupabase();
  const { data, error } = await supabase
    .from("album_reviews")
    .select("user_id, album_name, artist_name, cover_url, deezer_id, rating, created_at")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching weekly albums:", error);
    return empty;
  }

  // Un album = un deezer_id. Sans (ajout manuel), le couple titre/artiste.
  const groups = new Map<string, WeeklyAlbum & { sum: number }>();
  for (const row of data || []) {
    const key =
      row.deezer_id ||
      `${normalizeAlbumKey(row.album_name)}|${normalizeAlbumKey(row.artist_name)}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        album_name: row.album_name,
        artist_name: row.artist_name,
        cover_url: row.cover_url,
        deezer_id: row.deezer_id,
        avg_rating: 0,
        review_count: 0,
        user_rating: null,
        sum: 0,
      };
      groups.set(key, group);
    }

    group.sum += row.rating;
    group.review_count += 1;
    group.cover_url ??= row.cover_url;
    // Les lignes arrivent de la plus recente a la plus ancienne
    if (row.user_id === user.id && group.user_rating === null) {
      group.user_rating = row.rating;
    }
  }

  const albums: WeeklyAlbum[] = [...groups.values()]
    .map(({ sum, ...album }) => ({ ...album, avg_rating: sum / album.review_count }))
    .sort((a, b) => b.avg_rating - a.avg_rating || b.review_count - a.review_count);

  return { ...empty, albums };
}

// === Review de l'utilisateur courant pour un album donné (par deezer_id) ===
export async function getUserAlbumReviewByDeezerId(deezerId: string): Promise<AlbumReview | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("album_reviews")
    .select("*")
    .eq("user_id", user.id)
    .eq("deezer_id", deezerId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AlbumReview;
}

/**
 * L'album Deezer d'un ancien lien /albums/<id Spotify>.
 *
 * Les avis, la wishlist et les favoris gardent leur `spotify_id` : on y
 * retrouve l'album, puis son `deezer_id` (renseigne par
 * scripts/backfill-deezer.mjs) ou, a defaut, on le cherche par son nom.
 */
export async function resolveLegacyAlbumId(spotifyId: string): Promise<string | null> {
  const supabase = await createClient();

  for (const table of ["album_reviews", "album_wishlist", "favorite_albums"] as const) {
    const { data } = await supabase
      .from(table)
      .select("deezer_id, album_name, artist_name")
      .eq("spotify_id", spotifyId)
      .limit(1);
    const row = data?.[0];
    if (!row) continue;
    if (row.deezer_id) return row.deezer_id;
    const found = await findAlbum(row.album_name, row.artist_name);
    if (found) return found.id;
  }

  return null;
}

// === Recommandations d'albums (Pro/Band) ===

/** Le poids d'un morceau de la biblio : on recommande d'apres ce qu'on joue. */
const SONG_WEIGHT = { mastered: 3, learning: 2, want_to_learn: 1 } as const;

/**
 * Des albums a ecouter, d'apres ce qu'on fait dans Ostinara — rien d'autre.
 *
 * 1. Les artistes de reference : ceux des albums notes (la note compte,
 *    un album recent plus qu'un ancien) et ceux des morceaux de la biblio
 *    (un morceau maitrise plus qu'un morceau en attente).
 * 2. Leurs artistes proches selon Deezer. Un artiste proche de plusieurs
 *    references passe devant : c'est la ou les gouts se recoupent.
 * 3. L'album le plus ecoute de chacun, hors albums deja notes ou mis de
 *    cote. Chaque recommandation dit d'ou elle vient.
 */
export async function getAlbumRecommendations(): Promise<{
  success: boolean;
  error?: string;
  data?: AlbumRecommendation[];
}> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!profile || profile.plan === "free") {
    return { success: false, error: "Cette fonctionnalité nécessite un plan Pro ou Band" };
  }

  const [{ data: reviews }, { data: songs }, { data: wishlist }] = await Promise.all([
    supabase
      .from("album_reviews")
      .select("artist_name, album_name, deezer_id, rating, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("songs").select("artist, status").eq("user_id", user.id),
    supabase.from("album_wishlist").select("deezer_id, album_name").eq("user_id", user.id),
  ]);

  // ── 1. Les artistes de reference ─────────────────────────────────────────
  // Un artiste par nom, avec un score et ce qui l'a fait entrer : on joue
  // ses morceaux (`played`), sinon on a aime l'un de ses albums (`album`).
  const seeds = new Map<string, { name: string; score: number; played: boolean; album?: string }>();
  const bump = (rawName: string, score: number, source: { played: boolean; album?: string }) => {
    const name = rawName.split(",")[0].trim();
    if (!name || score <= 0) return;
    const key = name.toLowerCase();
    const seed = seeds.get(key);
    if (seed) {
      seed.score += score;
      seed.played ||= source.played;
      seed.album ??= source.album;
    } else {
      seeds.set(key, { name, score, ...source });
    }
  };

  (reviews ?? []).forEach((review, index) => {
    // Une note de 3/5 ne doit pas peser comme un 5/5 ; la recence compte.
    const ratingWeight = Math.max(0, review.rating - 4) / 2;
    const recency = 1 - index / 40;
    bump(review.artist_name, ratingWeight * recency, { played: false, album: review.album_name });
  });
  for (const song of songs ?? []) {
    const weight = SONG_WEIGHT[song.status as keyof typeof SONG_WEIGHT] ?? 1;
    bump(song.artist, weight, { played: true });
  }

  const topSeeds = [...seeds.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (topSeeds.length === 0) {
    return { success: true, data: [] };
  }

  // ── 2. Les artistes proches ──────────────────────────────────────────────
  const knownNames = new Set(seeds.keys());
  const candidates = new Map<string, { id: string; name: string; score: number; why: string }>();

  await Promise.all(
    topSeeds.map(async (seed) => {
      const [artist] = await searchArtists(seed.name, 1);
      if (!artist || artist.name.toLowerCase() !== seed.name.toLowerCase()) return;
      const related = await getRelatedArtists(artist.id, 8);
      related.forEach((candidate, rank) => {
        if (knownNames.has(candidate.name.toLowerCase())) return;
        const gain = seed.score * (1 - rank / 10);
        const current = candidates.get(candidate.id);
        if (current) {
          current.score += gain;
        } else {
          const reason = seed.played
            ? `Parce que tu joues ${seed.name}`
            : `Proche de ${seed.name}, dont tu as aimé « ${seed.album} »`;
          candidates.set(candidate.id, { id: candidate.id, name: candidate.name, score: gain, why: reason });
        }
      });
    })
  );

  const topCandidates = [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, 12);

  // ── 3. Un album par artiste ──────────────────────────────────────────────
  const excludedIds = new Set(
    [...(reviews ?? []), ...(wishlist ?? [])].map((row) => row.deezer_id).filter(Boolean)
  );

  const picks = await Promise.all(
    topCandidates.map(async (candidate) => {
      const albums = await getArtistAlbums(candidate.id, { name: candidate.name });
      const best = albums
        .filter((album) => album.record_type === "album" && !excludedIds.has(album.id))
        .sort((a, b) => (b.fans ?? 0) - (a.fans ?? 0))[0];
      return best ? { ...best, reason: candidate.why } : null;
    })
  );

  return {
    success: true,
    data: picks.filter((pick): pick is AlbumRecommendation => pick !== null),
  };
}

// === La fiche d'un album (tracklist, date de sortie) ===
// La recherche Deezer ne donne pas la date de sortie : on la lit ici quand
// un album est choisi.
export async function getCatalogAlbum(albumId: string): Promise<CatalogAlbumDetails | null> {
  try {
    return await getAlbumDetails(albumId);
  } catch (error) {
    console.error("Error fetching album details:", error);
    return null;
  }
}

// === Titres d'un album, pour choisir son morceau prefere ===
export async function getAlbumTracks(albumId: string): Promise<CatalogAlbumTrack[]> {
  try {
    const album = await getAlbumDetails(albumId);
    return album?.tracks?.items ?? [];
  } catch (error) {
    console.error("Error fetching album tracks:", error);
    return [];
  }
}

/**
 * Le morceau prefere d'un album, ajoute a la bibliotheque « à apprendre ».
 * Sans doublon : cf. addSongToLibrary.
 */
export async function addAlbumTrackToLibrary(input: {
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  deezer_id?: string;
}): Promise<{ success: boolean; error?: string; song?: Song; alreadyThere?: boolean }> {
  return addSongToLibrary(
    input,
    "want_to_learn",
    input.album ? { from: "album", label: input.album } : undefined
  );
}

// === Ce que l'on a deja d'un artiste ===

export interface ArtistLibraryContext {
  /** Ses morceaux dans la biblio. */
  songs: Pick<Song, "id" | "title" | "album" | "cover_url" | "status">[];
  /** Ses albums deja notes : identifiant Deezer -> note sur 10. */
  reviewed: Record<string, number>;
  /** Ses albums dans « À écouter ». */
  wishlisted: string[];
}

/**
 * La page d'un artiste, vue depuis sa propre pratique : les morceaux qu'on
 * en joue, les albums qu'on a ecoutes ou qu'on garde pour plus tard.
 *
 * Le nom d'artiste d'un morceau est du texte libre (« AC/DC », « Slash
 * feat. Myles Kennedy ») : on lit large avec `ilike`, puis on ne garde que
 * les morceaux ou l'artiste figure comme un nom entier.
 */
export async function getArtistLibraryContext(
  artistName: string,
  albumIds: string[]
): Promise<ArtistLibraryContext> {
  const empty: ArtistLibraryContext = { songs: [], reviewed: {}, wishlisted: [] };
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) return empty;

  const pattern = `%${artistName.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const ids = albumIds.length > 0 ? albumIds : ["-"];

  const [songsResult, reviewsResult, wishlistResult] = await Promise.all([
    supabase
      .from("songs")
      .select("id, title, artist, album, cover_url, status")
      .eq("user_id", user.id)
      .ilike("artist", pattern)
      .order("updated_at", { ascending: false }),
    supabase
      .from("album_reviews")
      .select("deezer_id, rating")
      .eq("user_id", user.id)
      .in("deezer_id", ids),
    supabase
      .from("album_wishlist")
      .select("deezer_id")
      .eq("user_id", user.id)
      .in("deezer_id", ids),
  ]);

  const target = artistName.trim().toLowerCase();
  const songs = (songsResult.data ?? [])
    .filter((song) =>
      String(song.artist)
        .split(/\s*(?:,|&|\/\/|\bfeat\.?|\bft\.?|\bwith\b)\s*/i)
        .some((name) => name.trim().toLowerCase() === target)
    )
    .map((song) => ({
      id: song.id,
      title: song.title,
      album: song.album,
      cover_url: song.cover_url,
      status: song.status,
    })) as ArtistLibraryContext["songs"];

  return {
    songs,
    reviewed: Object.fromEntries(
      (reviewsResult.data ?? []).map((row) => [row.deezer_id as string, row.rating as number])
    ),
    wishlisted: (wishlistResult.data ?? []).map((row) => row.deezer_id as string),
  };
}
