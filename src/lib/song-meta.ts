/**
 * La ligne de details d'un morceau, dans l'ordre ou un musicien en a
 * besoin avant de jouer : accordage, tempo vise, capo, puis difficulte.
 *
 * Partagee par la biblio, le profil d'un ami et le feed. Ne parle qu'a des
 * traducteurs passes en argument : utilisable cote client comme serveur.
 */

import { songTargetBpm } from "@/lib/song-progress";
import type { Song, SongDifficulty } from "@/types";

/** Ce qu'il faut d'un morceau pour en dire les details. */
export type SongDetails = Pick<
  Song,
  "tuning" | "capo_position" | "difficulty" | "target_bpm" | "tab_bpm" | "spotify_bpm"
>;

export const SONG_DETAILS_COLUMNS =
  "id, tuning, capo_position, difficulty, target_bpm, tab_bpm, spotify_bpm";

export function songMeta(
  song: SongDetails,
  labels: {
    capo: (position: number) => string;
    /** Par defaut « 120 BPM » ; a preciser la ou un autre tempo s'affiche a cote. */
    tempo?: (bpm: number) => string;
    /** Absent : la difficulte n'est pas dans la ligne (la biblio l'affiche en reperes). */
    difficulty?: (difficulty: SongDifficulty) => string;
  }
): string[] {
  const tempo = songTargetBpm(song);
  return [
    song.tuning || null,
    tempo ? (labels.tempo ? labels.tempo(tempo.bpm) : `${tempo.bpm} BPM`) : null,
    song.capo_position > 0 ? labels.capo(song.capo_position) : null,
    song.difficulty && labels.difficulty ? labels.difficulty(song.difficulty) : null,
  ].filter((part): part is string => Boolean(part));
}
