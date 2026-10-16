import { getTrackBpm } from '@/lib/services/deezer';
import { extractSongsterrId, fetchSongsterrTabStructure, findSongsterrSong } from '@/lib/services/songsterr';

/**
 * Le tempo d'un morceau qu'on vient d'ajouter, pour ne plus le saisir.
 *
 * La tab Songsterr d'abord : le tempo y est ecrit par un guitariste, a la
 * pulsation qu'on joue. Deezer ensuite, qui l'estime par analyse du son et
 * se trompe parfois du simple au double. Rien plutot qu'un chiffre farfelu.
 */
export async function findSongTempo(song: {
  title: string;
  artist: string;
  deezer_id?: string | null;
  tabs_url?: string | null;
}): Promise<number | null> {
  const songsterrId =
    (song.tabs_url ? extractSongsterrId(song.tabs_url) : null) ??
    (await findSongsterrSong(song.title, song.artist));
  if (songsterrId) {
    const structure = await fetchSongsterrTabStructure(songsterrId);
    if (structure && plausible(structure.bpm)) return structure.bpm;
  }

  const fromDeezer = song.deezer_id ? await getTrackBpm(song.deezer_id) : null;
  return fromDeezer && plausible(fromDeezer) ? fromDeezer : null;
}

/** Les bornes que `setSongTargetBpm` impose a la saisie. */
function plausible(bpm: number): boolean {
  return bpm >= 20 && bpm <= 300;
}
