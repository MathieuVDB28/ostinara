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
