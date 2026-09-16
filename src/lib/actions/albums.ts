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
