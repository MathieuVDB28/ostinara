/**
 * Le calcul du metronome partage de la jam, sans navigateur ni audio : tous les
 * appareils derivent le meme temps du meme instant de depart.
 */

export interface ClockSample {
  /** Heure locale a l'envoi et au retour de la requete, en ms. */
  sentAt: number;
  receivedAt: number;
  /** Heure du serveur dans la reponse, en ms. */
  serverNow: number;
}

/**
 * L'ecart entre l'horloge locale et celle du serveur. On garde l'aller-retour le
 * plus court : c'est celui ou le trajet aller et le trajet retour se ressemblent
 * le plus, donc ou l'estimation est la moins fausse.
 */
export function bestClockOffset(samples: ClockSample[]): number | null {
  if (samples.length === 0) return null;
  const best = samples.reduce((a, b) =>
    b.receivedAt - b.sentAt < a.receivedAt - a.sentAt ? b : a
  );
  return best.serverNow + (best.receivedAt - best.sentAt) / 2 - best.receivedAt;
}

export interface NextBeat {
  /** Dans combien de secondes tombe ce temps. */
  delaySeconds: number;
  /** Sa place dans la mesure, a partir de 0. */
  beatIndex: number;
}

/** Le prochain temps de la grille, `elapsedSeconds` apres le depart (negatif : pas encore parti). */
export function nextBeatFromStart(
  elapsedSeconds: number,
  bpm: number,
  beatsPerMeasure: number
): NextBeat {
  if (elapsedSeconds <= 0) return { delaySeconds: -elapsedSeconds, beatIndex: 0 };

  const secondsPerBeat = 60 / bpm;
  const beatNumber = Math.ceil(elapsedSeconds / secondsPerBeat);
  return {
    delaySeconds: beatNumber * secondsPerBeat - elapsedSeconds,
    beatIndex: beatNumber % beatsPerMeasure,
  };
}

/** L'ecart entre deux instants sur une grille de `period` secondes, ramene entre -period/2 et period/2. */
export function phaseError(a: number, b: number, period: number): number {
  const difference = (a - b) % period;
  if (difference > period / 2) return difference - period;
  if (difference < -period / 2) return difference + period;
  return difference;
}

/**
 * Le numero du prochain temps depuis le depart de la grille (0 = le premier).
 * Les `countInBeats` premiers sont le decompte.
 */
export function beatNumberFromStart(elapsedSeconds: number, bpm: number): number {
  if (elapsedSeconds <= 0) return 0;
  return Math.ceil(elapsedSeconds / (60 / bpm));
}

/** Ce qu'affiche le decompte sur ce temps : 4, 3, 2, 1 a chaque mesure ; null apres. */
export function countInLabel(beatNumber: number, countInBeats: number, beatsPerMeasure: number): number | null {
  if (beatNumber >= countInBeats) return null;
  return beatsPerMeasure - (beatNumber % beatsPerMeasure);
}

/** L'instant ou le morceau commence vraiment : apres le decompte, en ms sur l'horloge commune. */
export function songStartFrom(startAt: number, countInBeats: number, bpm: number): number {
  return startAt + (countInBeats * 60000) / bpm;
}

export interface SectionPosition {
  index: number;
  /** Avancement dans la section, de 0 a 1. */
  progress: number;
}

/** La section ou l'on est, `elapsedSeconds` apres le debut du morceau. */
export function sectionAt(elapsedSeconds: number, durations: number[]): SectionPosition {
  if (durations.length === 0 || elapsedSeconds <= 0) return { index: 0, progress: 0 };
  let start = 0;
  for (let index = 0; index < durations.length; index++) {
    const duration = durations[index];
    if (elapsedSeconds < start + duration) {
      return { index, progress: duration > 0 ? (elapsedSeconds - start) / duration : 1 };
    }
    start += duration;
  }
  return { index: durations.length - 1, progress: 1 };
}
