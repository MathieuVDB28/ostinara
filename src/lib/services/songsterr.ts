import type { SongsterrTabStructure, PlayedSection, Instrument } from '@/types';
// Les deux helpers d'URL vivent a part : ils sont aussi lus par des
// composants clients, qui n'ont pas a appeler Songsterr.
import { extractSongsterrId, getSongsterrUrl } from '@/lib/songsterr-url';

export { extractSongsterrId, getSongsterrUrl };

// New Songsterr API response format
interface SongsterrApiSong {
  songId: number;
  artistId: number;
  artist: string;
  title: string;
  hasPlayer: boolean;
  tracks: {
    instrumentId: number;
    instrument: string;
    name: string;
    tuning?: number[];
    difficulty?: number;
    hash: string;
  }[];
  defaultTrack: number;
}

/** La fiche d'une revision : de quoi trouver ses pistes sur le CDN. */
interface SongsterrMeta {
  revisionId: number;
  image: string;
  defaultTrack?: number;
  popularTrackGuitar?: number;
}

/** Une piste telle que le lecteur Songsterr la dessine (seulement les champs lus). */
interface SongsterrTrackJson {
  automations?: { tempo?: { measure: number; bpm: number }[] };
  measures: {
    signature?: [number, number];
    marker?: { text: string };
  }[];
}

/** Le CDN d'ou le lecteur de Songsterr charge ses pistes. */
const TRACKS_CDN = 'https://dqsljvtekg760.cloudfront.net';

export async function searchSongsterr(
  title: string,
  artist: string
): Promise<{ songId: number; title: string; artist: string }[]> {
  const query = `${artist} ${title}`.trim();
  if (!query) return [];

  try {
    const response = await fetch(
      `https://www.songsterr.com/api/songs?pattern=${encodeURIComponent(query)}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) return [];

    const data: SongsterrApiSong[] = await response.json();
    return data.slice(0, 10).map((s) => ({
      songId: s.songId,
      title: s.title,
      artist: s.artist,
    }));
  } catch {
    return [];
  }
}

/**
 * Le tempo, la mesure et les sections d'une tab Songsterr.
 *
 * Songsterr ne livre plus le fichier Guitar Pro (`source` est vide sur les
 * revisions) : on lit la piste que son lecteur charge, un JSON sur leur CDN.
 * Toutes les pistes portent le meme tempo ; on prend la guitare la plus jouee.
 */
export async function fetchSongsterrTabStructure(
  songId: number
): Promise<SongsterrTabStructure | null> {
  try {
    const metaRes = await fetch(`https://www.songsterr.com/api/meta/${songId}`, {
      next: { revalidate: 3600 },
    });
    if (!metaRes.ok) return null;
    const meta = (await metaRes.json()) as SongsterrMeta;
    if (!meta.revisionId || !meta.image) return null;

    const track = meta.popularTrackGuitar ?? meta.defaultTrack ?? 0;
    const trackRes = await fetch(
      `${TRACKS_CDN}/${songId}/${meta.revisionId}/${meta.image}/${track}.json`,
      { next: { revalidate: 86400 } }
    );
    if (!trackRes.ok) return null;

    return toStructure((await trackRes.json()) as SongsterrTrackJson);
  } catch (e) {
    console.error('Error fetching Songsterr tab structure:', e);
    return null;
  }
}

function toStructure(track: SongsterrTrackJson): SongsterrTabStructure {
  const measures = track.measures ?? [];
  const firstTempo = [...(track.automations?.tempo ?? [])].sort((a, b) => a.measure - b.measure)[0];
  const [timeSignatureBeats, timeSignatureValue] = measures[0]?.signature ?? [4, 4];

  // Une section court de son marqueur jusqu'a la mesure avant le suivant.
  const markers = measures
    .map((measure, index) => ({ name: measure.marker?.text?.trim() ?? '', index }))
    .filter((marker) => marker.name);
  const sections: PlayedSection[] = markers.map((marker, i) => ({
    name: marker.name,
    startMeasure: marker.index + 1,
    endMeasure: i < markers.length - 1 ? markers[i + 1].index : measures.length,
  }));

  return {
    bpm: firstTempo ? Math.round(firstTempo.bpm) : 0,
    totalMeasures: measures.length,
    timeSignatureBeats,
    timeSignatureValue,
    sections,
  };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*[([].*?[)\]]\s*/g, ' ')
    .replace(/\s+-\s+.*$/, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * La tab Songsterr d'un morceau : meme artiste, meme titre. Pas de « Misc
 * Covers », pas de « (Acoustic) » ni « (Live) » s'il y a la version tout
 * court — Songsterr les classe deja par popularite, on garde le premier.
 */
export async function findSongsterrSong(title: string, artist: string): Promise<number | null> {
  // « The Eagles » chez Songsterr, « Eagles » chez Deezer.
  const bare = (name: string) => normalize(name).replace(/^the /, '');
  const wantedArtist = bare(artist.split(',')[0]);
  const wantedTitle = normalize(title);
  if (!wantedArtist || !wantedTitle) return null;

  const results = (await searchSongsterr(title, artist)).filter(
    (song) => bare(song.artist) === wantedArtist
  );
  const exact = results.find((song) => song.title.trim().toLowerCase() === title.trim().toLowerCase());
  const same = results.find((song) => normalize(song.title) === wantedTitle);
  return (exact ?? same)?.songId ?? null;
}

/** Une piste de la fiche Songsterr (seulement les champs lus). */
interface SongsterrMetaTrack {
  instrumentId: number;
  instrument: string;
  name: string;
  views?: number;
  isVocalTrack?: boolean;
  isEmpty?: boolean;
}

/**
 * La piste a choisir pour un instrument : la plus jouee parmi celles qui
 * lui correspondent.
 *
 * Les `instrumentId` suivent la numerotation General MIDI (0-7 pianos,
 * 16-23 orgues, 24-31 guitares, 32-39 basses) ; Songsterr note la
 * batterie 1024. Le nom de l'instrument rattrape les cas limites.
 *
 * On ne sait pas ouvrir Songsterr directement sur une piste (le suffixe de
 * piste saute a la redirection) : l'appelant affiche son nom, pour qu'on
 * la choisisse dans le lecteur.
 */
export async function findSongsterrTrack(
  songId: number,
  instrument: Instrument
): Promise<{ index: number; name: string } | null> {
  if (instrument === 'other') return null;
  try {
    const res = await fetch(`https://www.songsterr.com/api/meta/${songId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const meta = (await res.json()) as { tracks?: SongsterrMetaTrack[] };

    const fits = (track: SongsterrMetaTrack): boolean => {
      const id = track.instrumentId;
      const name = track.instrument.toLowerCase();
      switch (instrument) {
        case 'drums':
          return id === 1024 || name.includes('drum');
        case 'bass':
          return (id >= 32 && id <= 39) || name.includes('bass');
        case 'keys':
          return (id >= 0 && id <= 7) || (id >= 16 && id <= 23) || /piano|organ|keyboard|synth/.test(name);
        case 'guitar':
          return (id >= 24 && id <= 31) || (name.includes('guitar') && !name.includes('bass'));
        default:
          return false;
      }
    };

    let best: { index: number; name: string; views: number } | null = null;
    (meta.tracks ?? []).forEach((track, index) => {
      if (track.isVocalTrack || track.isEmpty || !fits(track)) return;
      const views = track.views ?? 0;
      if (!best || views > best.views) best = { index, name: track.name, views };
    });

    if (!best) return null;
    const { index, name } = best;
    return { index, name };
  } catch (e) {
    console.error('Error fetching Songsterr tracks:', e);
    return null;
  }
}
