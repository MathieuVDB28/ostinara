/**
 * La serie de pratique, une seule regle pour toute l'app.
 *
 * Un jour manque ne casse pas la serie, deux si. Le jour de creux la garde
 * sans l'augmenter : lundi, mercredi et jeudi font 3 jours, comme le gel de
 * serie de Duolingo. Les jours sont ceux de Paris : une session a 23 h 30
 * compte pour ce soir-la, quelle que soit l'heure du serveur.
 *
 * Module pur, importe par les Server Actions, les badges et le cron.
 */

/** Ecart maximal entre deux jours joues d'une meme serie : un jour de creux. */
export const STREAK_MAX_GAP = 2;

const PARIS_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** « 2026-10-15 », le jour a Paris. */
export function parisDay(value: string | Date = new Date()): string {
  return PARIS_DAY.format(new Date(value));
}

export function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Le lundi de la semaine d'un jour. */
export function mondayOf(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return shiftDay(day, -((weekday + 6) % 7));
}

/**
 * La serie en cours et la plus longue, en jours joues. `days` : des jours
 * YYYY-MM-DD, doublons acceptes. Une session datee dans le futur ne compte pas.
 */
export function computeStreak(
  days: Iterable<string>,
  today: string = parisDay()
): { current: number; longest: number } {
  const todayNumber = dayNumber(today);
  const played = [...new Set(days)]
    .map(dayNumber)
    .filter((day) => day <= todayNumber)
    .sort((a, b) => a - b);

  let run = 0;
  let longest = 0;
  let previous: number | null = null;
  for (const day of played) {
    run = previous !== null && day - previous <= STREAK_MAX_GAP ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  const alive = previous !== null && todayNumber - previous <= STREAK_MAX_GAP;
  return { current: alive ? run : 0, longest };
}
