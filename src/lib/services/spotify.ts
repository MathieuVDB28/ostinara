import type { SpotifySearchResult, SpotifyTrack, SpotifyAlbumSearchResult, SpotifyAlbum, SpotifyAudioFeatures } from '@/types';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

let accessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  // Si le token est encore valide, le réutiliser
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data = await response.json();
  accessToken = data.access_token as string;
  // Expire 1 minute avant pour être sûr
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return accessToken!;
}

export async function searchTracks(query: string, limit: number = 10): Promise<SpotifyTrack[]> {
  if (!query.trim()) {
    return [];
  }

  const token = await getAccessToken();

  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to search Spotify');
  }

  const data: SpotifySearchResult = await response.json();
  return data.tracks.items;
}

export function formatTrackForSong(track: SpotifyTrack) {
  return {
    id: track.id, // ID Spotify pour l'utiliser comme clé React
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    cover_url: track.album.images[0]?.url,
    spotify_id: track.id,
    preview_url: track.preview_url,
  };
}

export async function searchAlbums(query: string, limit: number = 10): Promise<SpotifyAlbum[]> {
  if (!query.trim()) {
    return [];
  }

  const token = await getAccessToken();

  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to search Spotify albums');
  }

  const data: SpotifyAlbumSearchResult = await response.json();
  return data.albums.items;
}

export function formatAlbumForFavorite(album: SpotifyAlbum) {
  return {
    id: album.id,
    name: album.name,
    artists: album.artists,
    images: album.images,
  };
}

// Key names for conversion (Pitch Class Notation)
export const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const MODE_NAMES = ['Minor', 'Major'] as const;

export function formatKeyName(key: number, mode: number): string {
  if (key < 0 || key > 11) return 'Unknown';
  return `${KEY_NAMES[key]} ${MODE_NAMES[mode] || 'Minor'}`;
}

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role credentials not configured');
  return createServiceRoleClient(url, key);
}

export async function getUserSpotifyToken(userId: string): Promise<string | null> {
  const supabase = getServiceRoleSupabase();

  const { data, error } = await supabase
    .from('profiles')
    .select('spotify_access_token, spotify_refresh_token, spotify_token_expires_at')
    .eq('id', userId)
    .single();

  if (error || !data?.spotify_access_token) return null;

  // Check if token is expired
  const expiresAt = new Date(data.spotify_token_expires_at).getTime();
  if (Date.now() < expiresAt - 60000) {
    return data.spotify_access_token;
  }

  // Refresh the token
  if (!data.spotify_refresh_token) return null;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: data.spotify_refresh_token,
    }),
  });

  if (!response.ok) return null;

  const tokenData = await response.json();
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  await supabase
    .from('profiles')
    .update({
      spotify_access_token: tokenData.access_token,
      spotify_token_expires_at: newExpiresAt,
      ...(tokenData.refresh_token ? { spotify_refresh_token: tokenData.refresh_token } : {}),
    })
    .eq('id', userId);

  return tokenData.access_token;
}

export async function getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures | null> {
  const token = await getAccessToken();

  const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;
  return response.json();
}

export async function getAudioFeaturesBatch(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
  if (trackIds.length === 0) return [];

  const token = await getAccessToken();
  const ids = trackIds.slice(0, 100).join(',');

  const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.audio_features || []).filter(Boolean);
}
