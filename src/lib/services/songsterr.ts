import type { SongsterrSong } from '@/types';

export async function searchSongsterr(title: string, artist: string): Promise<SongsterrSong[]> {
  const query = `${artist} ${title}`.trim();
  if (!query) return [];

  try {
    const response = await fetch(
      `https://www.songsterr.com/a/ra/songs.json?pattern=${encodeURIComponent(query)}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data as SongsterrSong[]).slice(0, 10);
  } catch {
    return [];
  }
}

export function getSongsterrUrl(songId: number): string {
  return `https://www.songsterr.com/a/wsa/${songId}`;
}
