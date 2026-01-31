"use server";

import { createClient } from "@/lib/supabase/server";
import { getAudioFeatures, formatKeyName } from "@/lib/services/spotify";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import type { SpotifyConnectionStatus, SongAudioFeatures, UserPlan } from "@/types";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role credentials not configured");
  return createServiceRoleClient(url, key);
}

export async function getSpotifyConnectionStatus(): Promise<SpotifyConnectionStatus> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log("[Spotify Status] No authenticated user");
    return { connected: false };
  }

  console.log("[Spotify Status] User:", user.id);

  const adminSupabase = getServiceRoleSupabase();
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("spotify_user_id, spotify_connected_at, spotify_access_token")
    .eq("id", user.id)
    .single();

  console.log("[Spotify Status] Query result:", {
    hasData: !!data,
    hasToken: !!data?.spotify_access_token,
    spotifyUserId: data?.spotify_user_id,
    error: error?.message,
  });

  if (!data?.spotify_access_token) {
    return { connected: false };
  }

  return {
    connected: true,
    spotify_user_id: data.spotify_user_id || undefined,
    connected_at: data.spotify_connected_at || undefined,
  };
}

export async function requirePaidPlan(): Promise<{ allowed: boolean; plan: UserPlan; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, plan: "free", error: "Non authentifié" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (data?.plan || "free") as UserPlan;
  if (plan === "free") {
    return { allowed: false, plan, error: "Fonctionnalité réservée aux plans Pro et Band" };
  }

  return { allowed: true, plan };
}

export async function fetchAndCacheAudioFeatures(
  songId: string
): Promise<{ success: boolean; features?: SongAudioFeatures; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Check plan
  const planCheck = await requirePaidPlan();
  if (!planCheck.allowed) {
    return { success: false, error: planCheck.error };
  }

  // Get the song
  const { data: song } = await supabase
    .from("songs")
    .select("spotify_id, spotify_bpm, spotify_key, spotify_energy, spotify_audio_fetched_at")
    .eq("id", songId)
    .eq("user_id", user.id)
    .single();

  if (!song) {
    return { success: false, error: "Morceau introuvable" };
  }

  if (!song.spotify_id) {
    return { success: false, error: "Aucun identifiant Spotify associé à ce morceau" };
  }

  // Check cache (re-fetch only if older than 7 days)
  if (song.spotify_audio_fetched_at) {
    const fetchedAt = new Date(song.spotify_audio_fetched_at).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (fetchedAt > sevenDaysAgo && song.spotify_bpm != null) {
      return {
        success: true,
        features: {
          bpm: song.spotify_bpm!,
          key: formatKeyName(song.spotify_key ?? -1, 1),
          energy: song.spotify_energy ?? 0,
          fetched_at: song.spotify_audio_fetched_at,
        },
      };
    }
  }

  // Fetch from Spotify
  const audioFeatures = await getAudioFeatures(song.spotify_id);
  if (!audioFeatures) {
    return { success: false, error: "Impossible de récupérer les données audio" };
  }

  const now = new Date().toISOString();

  // Update the song
  await supabase
    .from("songs")
    .update({
      spotify_bpm: audioFeatures.tempo,
      spotify_key: audioFeatures.key,
      spotify_energy: audioFeatures.energy,
      spotify_audio_fetched_at: now,
    })
    .eq("id", songId)
    .eq("user_id", user.id);

  return {
    success: true,
    features: {
      bpm: audioFeatures.tempo,
      key: formatKeyName(audioFeatures.key, audioFeatures.mode),
      energy: audioFeatures.energy,
      fetched_at: now,
    },
  };
}

export async function importSpotifyPlaylist(
  playlistId: string,
  selectedTrackIds: string[]
): Promise<{ success: boolean; imported: number; skipped: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, imported: 0, skipped: 0, error: "Non authentifié" };
  }

  const planCheck = await requirePaidPlan();
  if (!planCheck.allowed) {
    return { success: false, imported: 0, skipped: 0, error: planCheck.error };
  }

  // Get existing songs to check for duplicates
  const { data: existingSongs } = await supabase
    .from("songs")
    .select("spotify_id")
    .eq("user_id", user.id)
    .not("spotify_id", "is", null);

  const existingSpotifyIds = new Set(existingSongs?.map((s) => s.spotify_id) || []);

  // Fetch playlist tracks from Spotify
  const { getUserSpotifyToken } = await import("@/lib/services/spotify");
  const token = await getUserSpotifyToken(user.id);
  if (!token) {
    return { success: false, imported: 0, skipped: 0, error: "Connexion Spotify expirée" };
  }

  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    return { success: false, imported: 0, skipped: 0, error: "Impossible de récupérer les morceaux" };
  }

  const data = await response.json();
  const tracks = data.items
    .filter((item: { track: { id: string } | null }) => item.track && selectedTrackIds.includes(item.track.id))
    .map((item: { track: { id: string; name: string; artists: { name: string }[]; album: { name: string; images: { url: string }[] }; preview_url: string | null } }) => item.track);

  let imported = 0;
  let skipped = 0;

  for (const track of tracks) {
    if (existingSpotifyIds.has(track.id)) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("songs").insert({
      user_id: user.id,
      title: track.name,
      artist: track.artists.map((a: { name: string }) => a.name).join(", "),
      album: track.album.name,
      cover_url: track.album.images[0]?.url,
      spotify_id: track.id,
      preview_url: track.preview_url,
      status: "want_to_learn",
      progress_percent: 0,
      tuning: "Standard",
      capo_position: 0,
    });

    if (!error) {
      imported++;
      existingSpotifyIds.add(track.id);
    } else {
      skipped++;
    }
  }

  return { success: true, imported, skipped };
}
