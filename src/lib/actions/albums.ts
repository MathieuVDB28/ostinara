"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { createActivity } from "./activities";
import { getRecommendations, getArtistId, getAlbumArtistIds } from "@/lib/services/spotify";
import { getSimilarArtists } from "@/lib/services/lastfm";
import type {
  AlbumReview,
  AlbumCommunityStats,
  WeeklyAlbum,
  WeeklyAlbums,
  CreateAlbumReviewInput,
  UpdateAlbumReviewInput,
  SpotifyRecommendation,
} from "@/types";

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
      spotify_id: input.spotify_id || null,
      spotify_url: input.spotify_url || null,
      release_date: input.release_date || null,
      total_tracks: input.total_tracks || null,
      rating: input.rating,
      review: input.review || null,
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
    },
  });

  revalidatePath("/albums");
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
export async function getAlbumCommunityStats(spotifyId: string): Promise<AlbumCommunityStats | null> {
  const supabase = getServiceRoleSupabase();

  const { data, error } = await supabase
    .from("album_reviews")
    .select("rating")
    .eq("spotify_id", spotifyId);

  if (error || !data || data.length === 0) return null;

  const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  return { avg_rating: avg, review_count: data.length };
}

// === Notes communauté pour plusieurs albums (batch, pour la fiche artiste) ===
export async function getAlbumsCommunityStats(
  spotifyIds: string[]
): Promise<Record<string, AlbumCommunityStats>> {
  if (spotifyIds.length === 0) return {};

  const supabase = getServiceRoleSupabase();

  const { data, error } = await supabase
    .from("album_reviews")
    .select("spotify_id, rating")
    .in("spotify_id", spotifyIds);

  if (error || !data) return {};

  const result: Record<string, { sum: number; count: number }> = {};
  for (const row of data) {
    if (!row.spotify_id) continue;
    if (!result[row.spotify_id]) result[row.spotify_id] = { sum: 0, count: 0 };
    result[row.spotify_id].sum += row.rating;
    result[row.spotify_id].count += 1;
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
    .select("user_id, album_name, artist_name, cover_url, spotify_id, rating, created_at")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching weekly albums:", error);
    return empty;
  }

  // Un album = un spotify_id. Sans (ajout manuel), le couple titre/artiste.
  const groups = new Map<string, WeeklyAlbum & { sum: number }>();
  for (const row of data || []) {
    const key =
      row.spotify_id ||
      `${normalizeAlbumKey(row.album_name)}|${normalizeAlbumKey(row.artist_name)}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        album_name: row.album_name,
        artist_name: row.artist_name,
        cover_url: row.cover_url,
        spotify_id: row.spotify_id,
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

// === Review de l'utilisateur courant pour un album donné (par spotify_id) ===
export async function getUserAlbumReviewBySpotifyId(spotifyId: string): Promise<AlbumReview | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("album_reviews")
    .select("*")
    .eq("user_id", user.id)
    .eq("spotify_id", spotifyId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AlbumReview;
}

// === Récupérer des recommandations basées sur les albums écoutés (Pro/Band only) ===
export async function getAlbumRecommendations(): Promise<{
  success: boolean;
  error?: string;
  data?: SpotifyRecommendation[];
}> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Vérifier le plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!profile || profile.plan === "free") {
    return { success: false, error: "Cette fonctionnalité nécessite un plan Pro ou Band" };
  }

  // Récupérer les albums écoutés récemment
  const { data: reviews } = await supabase
    .from("album_reviews")
    .select("artist_name, spotify_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(15);

  if (!reviews || reviews.length === 0) {
    return { success: true, data: [] };
  }

  // ── Étape 1 : résoudre les IDs Spotify des artistes écoutés ──────────────
  const seenArtistIds = new Set<string>();
  const seedArtistIds: string[] = [];
  const seedArtistNames = [...new Set(reviews.map((r) => r.artist_name))];

  for (const review of reviews.slice(0, 8)) {
    if (seedArtistIds.length >= 6) break;
    if (review.spotify_id) {
      const ids = await getAlbumArtistIds(review.spotify_id);
      for (const id of ids) {
        if (!seenArtistIds.has(id)) {
          seenArtistIds.add(id);
          seedArtistIds.push(id);
        }
      }
    }
  }
  // Fallback : recherche par nom pour les reviews sans spotify_id
  for (const name of seedArtistNames.slice(0, 6)) {
    if (seedArtistIds.length >= 6) break;
    const id = await getArtistId(name);
    if (id && !seenArtistIds.has(id)) {
      seenArtistIds.add(id);
      seedArtistIds.push(id);
    }
  }

  if (seedArtistIds.length === 0) {
    console.error("getAlbumRecommendations: impossible de résoudre les IDs Spotify");
    return { success: true, data: [] };
  }

  // ── Étape 2 : artistes similaires via Last.fm ─────────────────────────────
  // On prend max 3 similaires PAR artiste source pour couvrir toute la collection
  // et garder un temps de réponse acceptable (~3 similaires × N artistes sources).
  const reviewedNamesLower = new Set(seedArtistNames.map((n) => n.toLowerCase()));
  const similarArtistIds: string[] = [];
  const seenSimilarIds = new Set(seenArtistIds);
  const MAX_SIMILAR_PER_ARTIST = 3;

  for (const artistName of seedArtistNames.slice(0, 6)) {
    const similarNames = await getSimilarArtists(artistName);
    console.log(`[recos] Last.fm similar to "${artistName}":`, similarNames.slice(0, 5));

    let addedForThisArtist = 0;
    for (const name of similarNames) {
      if (addedForThisArtist >= MAX_SIMILAR_PER_ARTIST) break;
      if (reviewedNamesLower.has(name.toLowerCase())) continue;
      const id = await getArtistId(name);
      if (id && !seenSimilarIds.has(id)) {
        seenSimilarIds.add(id);
        similarArtistIds.push(id);
        addedForThisArtist++;
      }
    }
  }

  console.log(`[recos] ${similarArtistIds.length} similar artist IDs from Last.fm`);

  // Utilise les artistes similaires si Last.fm a renvoyé des résultats,
  // sinon fallback sur les artistes déjà écoutés
  const targetArtistIds = similarArtistIds.length > 0 ? similarArtistIds : seedArtistIds;

  // Obtenir les albums de ces artistes via Spotify
  const albums = await getRecommendations(targetArtistIds, 20);

  // Filtrer les albums déjà reviewés
  const reviewedSpotifyIds = new Set(reviews.map((r) => r.spotify_id).filter(Boolean));
  const filtered = albums.filter((a) => !reviewedSpotifyIds.has(a.id));

  return {
    success: true,
    data: filtered.map((a) => ({
      id: a.id,
      name: a.name,
      artists: a.artists,
      images: a.images,
      external_urls: a.external_urls,
      release_date: a.release_date,
      total_tracks: a.total_tracks,
    })),
  };
}
