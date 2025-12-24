import type { SpotifySearchResult, SpotifyTrack } from '@/types';

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
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    cover_url: track.album.images[0]?.url,
    spotify_id: track.id,
    preview_url: track.preview_url,
  };
}
