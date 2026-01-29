"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  Playlist,
  PlaylistWithSongs,
  Song,
  CreatePlaylistInput,
  UpdatePlaylistInput,
} from "@/types";

// === Get all playlists with songs ===
export async function getPlaylists(): Promise<PlaylistWithSongs[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: playlists, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching playlists:", error);
    return [];
  }

  // For each playlist, fetch its songs via the junction table
  const results: PlaylistWithSongs[] = [];

  for (const playlist of playlists) {
    const { data: playlistSongs } = await supabase
      .from("playlist_songs")
      .select("song_id, position")
      .eq("playlist_id", playlist.id)
      .order("position", { ascending: true });

    const songIds = playlistSongs?.map((ps) => ps.song_id) || [];

    let songs: Song[] = [];
    if (songIds.length > 0) {
      const { data: songsData } = await supabase
        .from("songs")
        .select("*")
        .in("id", songIds);

      // Sort songs by playlist position
      if (songsData) {
        const positionMap = new Map(
          playlistSongs?.map((ps) => [ps.song_id, ps.position]) || []
        );
        songs = songsData.sort(
          (a, b) => (positionMap.get(a.id) || 0) - (positionMap.get(b.id) || 0)
        );
      }
    }

    results.push({
      ...playlist,
      songs,
      song_count: songIds.length,
    });
  }

  return results;
}

// === Get a single playlist with songs ===
export async function getPlaylist(
  playlistId: string
): Promise<PlaylistWithSongs | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: playlist, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", playlistId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching playlist:", error);
    return null;
  }

  const { data: playlistSongs } = await supabase
    .from("playlist_songs")
    .select("song_id, position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });

  const songIds = playlistSongs?.map((ps) => ps.song_id) || [];

  let songs: Song[] = [];
  if (songIds.length > 0) {
    const { data: songsData } = await supabase
      .from("songs")
      .select("*")
      .in("id", songIds);

    if (songsData) {
      const positionMap = new Map(
        playlistSongs?.map((ps) => [ps.song_id, ps.position]) || []
      );
      songs = songsData.sort(
        (a, b) => (positionMap.get(a.id) || 0) - (positionMap.get(b.id) || 0)
      );
    }
  }

  return {
    ...playlist,
    songs,
    song_count: songIds.length,
  };
}

// === Create a playlist ===
export async function createPlaylist(
  input: CreatePlaylistInput
): Promise<{ success: boolean; error?: string; playlist?: Playlist }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      ...input,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating playlist:", error);
    return { success: false, error: "Erreur lors de la création" };
  }

  revalidatePath("/library");
  return { success: true, playlist: data as Playlist };
}

// === Update a playlist ===
export async function updatePlaylist(
  playlistId: string,
  input: UpdatePlaylistInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("playlists")
    .update(input)
    .eq("id", playlistId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating playlist:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }

  revalidatePath("/library");
  return { success: true };
}

// === Delete a playlist ===
export async function deletePlaylist(
  playlistId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting playlist:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/library");
  return { success: true };
}

// === Add a song to a playlist ===
export async function addSongToPlaylist(
  playlistId: string,
  songId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Get max position
  const { data: existing } = await supabase
    .from("playlist_songs")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("playlist_songs").insert({
    playlist_id: playlistId,
    song_id: songId,
    position: nextPosition,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Ce morceau est déjà dans cette playlist" };
    }
    console.error("Error adding song to playlist:", error);
    return { success: false, error: "Erreur lors de l'ajout" };
  }

  revalidatePath("/library");
  return { success: true };
}

// === Remove a song from a playlist ===
export async function removeSongFromPlaylist(
  playlistId: string,
  songId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  const { error } = await supabase
    .from("playlist_songs")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("song_id", songId);

  if (error) {
    console.error("Error removing song from playlist:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }

  revalidatePath("/library");
  return { success: true };
}

// === Get playlists that contain a specific song ===
export async function getPlaylistsForSong(
  songId: string
): Promise<Playlist[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: playlistSongs } = await supabase
    .from("playlist_songs")
    .select("playlist_id")
    .eq("song_id", songId);

  if (!playlistSongs || playlistSongs.length === 0) return [];

  const playlistIds = playlistSongs.map((ps) => ps.playlist_id);

  const { data: playlists, error } = await supabase
    .from("playlists")
    .select("*")
    .in("id", playlistIds)
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching playlists for song:", error);
    return [];
  }

  return playlists as Playlist[];
}
