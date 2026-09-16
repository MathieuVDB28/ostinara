/**
 * La progression d'un morceau se mesure en BPM, pas en pourcentage.
 *
 * `songs.progress_percent` etait saisi a la main, au curseur : un chiffre
 * que personne ne bouge apres la premiere semaine, et qui ne dit rien. Le
 * tempo, lui, est mesure a chaque session (`practice_sessions.bpm_achieved`)
 * et compare a une cible qui existe deja (`songs.target_bpm`).
 *
 * Ce module ne parle qu'a des nombres : il est importe aussi bien par les
 * Server Actions que par les composants clients.
 */

import type { Song, SongTempoProgress } from "@/types";

/**
 * Le tempo vise pour un morceau, et d'ou il vient.
 *
 * Trois sources, dans l'ordre de confiance :
 *   1. `target_bpm`  — regle par le guitariste, il decide ;
 *   2. `tab_bpm`     — lu dans le fichier Guitar Pro, c'est la partition ;
 *   3. `spotify_bpm` — l'enregistrement original, une estimation.
 */
export function songTargetBpm(
  song: Pick<Song, "target_bpm" | "tab_bpm" | "spotify_bpm">
): { bpm: number; source: SongTempoProgress["source"] } | null {
  if (song.target_bpm) return { bpm: song.target_bpm, source: "manual" };
  if (song.tab_bpm) return { bpm: song.tab_bpm, source: "tab" };
  if (song.spotify_bpm) {
    return { bpm: Math.round(song.spotify_bpm), source: "spotify" };
  }
  return null;
}

/**
 * Le plancher du travail lent : 60 % de la cible, arrondi a la dizaine.
 *
 * C'est la regle de l'echelle de tempo — on ne part jamais de zero, on part
 * lentement. Sans plancher, un morceau a 160 BPM travaille a 100 afficherait
 * 62 % alors qu'il est deja bien engage.
 */
export function slowPracticeFloor(targetBpm: number): number {
  return Math.max(40, Math.round((targetBpm * 0.6) / 5) * 5);
}

/**
 * Ou en est le morceau, en tempo.
 *
 * Retourne `null` quand aucune cible n'est connue : mieux vaut ne rien
 * afficher qu'un pourcentage invente.
 */
export function songTempoProgress(
  song: Pick<Song, "target_bpm" | "tab_bpm" | "spotify_bpm">,
  bestBpm: number | null | undefined
): SongTempoProgress | null {
  const target = songTargetBpm(song);
  if (!target) return null;

  const floor = slowPracticeFloor(target.bpm);
  const achieved = bestBpm ?? floor;

  // La cible peut avoir ete baissee sous le plancher (un morceau lent) :
  // la division doit rester sure.
  const span = Math.max(1, target.bpm - floor);
  const percent = Math.min(
    100,
    Math.max(0, Math.round(((achieved - floor) / span) * 100))
  );

  return {
    target: target.bpm,
    achieved,
    floor,
    percent,
    atTempo: achieved >= target.bpm,
    source: target.source,
  };
}

/**
 * Le pourcentage a ecrire dans `songs.progress_percent`.
 *
 * La colonne reste : le profil public, les favoris et les tris s'en servent.
 * Elle cesse simplement d'etre saisie — elle est derivee du tempo a chaque
 * session enregistree. Sans cible connue, on ne touche a rien (`null`), et
 * la valeur existante est conservee.
 */
export function derivedProgressPercent(
  song: Pick<Song, "target_bpm" | "tab_bpm" | "spotify_bpm" | "status">,
  bestBpm: number | null | undefined
): number | null {
  if (song.status === "mastered") return 100;
  const progress = songTempoProgress(song, bestBpm);
  return progress ? progress.percent : null;
}

/** Le prochain palier de travail : +4 BPM, comme l'echelle des exercices. */
export function nextTempoStep(
  current: number,
  target: number,
  step = 4
): number {
  return Math.min(target, current + step);
}
