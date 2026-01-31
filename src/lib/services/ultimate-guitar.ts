import type { TabSource } from '@/types';

export function getUltimateGuitarSearchUrl(title: string, artist: string): string {
  const query = `${artist} ${title}`.trim();
  return `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query)}`;
}

export function getTabSources(title: string, artist: string): TabSource[] {
  const searchUrl = getUltimateGuitarSearchUrl(title, artist);

  return [
    {
      source: 'ultimate_guitar',
      title: `${title} - ${artist}`,
      artist,
      url: searchUrl,
      type: 'Tabs & Chords',
    },
  ];
}
