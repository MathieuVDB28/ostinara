import type { RecurrenceType } from "@/types";
import { fromWallTime, shiftWallDays, toWallTime, wallDateKey, wallDaysBetween } from "./time-zone";

/** Deux ans de repetes hebdomadaires. */
export const MAX_SERIES_OCCURRENCES = 104;

/**
 * Les dates d'une serie apres la premiere, a la meme heure au mur, jour de
 * fin compris (`until`, YYYY-MM-DD). Une serie mensuelle garde son jour : le
 * 31 tombe le dernier jour des mois plus courts.
 */
export function seriesDates(start: Date, recurrence: RecurrenceType, until: string, timeZone: string): Date[] {
  if (recurrence === "none") return [];
  const first = toWallTime(start, timeZone);
  const dates: Date[] = [];

  for (let n = 1; n < MAX_SERIES_OCCURRENCES; n++) {
    let wall;
    if (recurrence === "monthly") {
      const month = new Date(Date.UTC(first.year, first.month - 1 + n, 1));
      const year = month.getUTCFullYear();
      const lastDay = new Date(Date.UTC(year, month.getUTCMonth() + 1, 0)).getUTCDate();
      wall = { ...first, year, month: month.getUTCMonth() + 1, day: Math.min(first.day, lastDay) };
    } else {
      wall = shiftWallDays(first, n * (recurrence === "weekly" ? 7 : 14));
    }
    const date = fromWallTime(wall, timeZone);
    if (wallDateKey(date, timeZone) > until) break;
    dates.push(date);
  }
  return dates;
}

/** Deplacer la suite d'une serie : meme decalage en jours, nouvelle heure. */
export function moveLike(date: Date, from: Date, to: Date, timeZone: string): Date {
  const wallTo = toWallTime(to, timeZone);
  const days = wallDaysBetween(toWallTime(from, timeZone), wallTo);
  return fromWallTime(
    { ...shiftWallDays(toWallTime(date, timeZone), days), hour: wallTo.hour, minute: wallTo.minute },
    timeZone
  );
}

/** Une fin avant le debut est celle du lendemain (22 h a 0 h 30). */
export function endAfter(start: Date, end: Date, timeZone: string): Date {
  return end > start ? end : fromWallTime(shiftWallDays(toWallTime(end, timeZone), 1), timeZone);
}

/** La premiere seance, puis chaque jour choisi jusqu'a la date de fin, a la meme heure. */
export function occurrences(start: Date, weekdays: number[], until: string, timeZone: string): Date[] {
  const first = toWallTime(start, timeZone);
  const dates = [start];
  for (let day = 1; dates.length <= MAX_SERIES_OCCURRENCES && day <= 731; day++) {
    const wall = shiftWallDays(first, day);
    const date = fromWallTime(wall, timeZone);
    if (wallDateKey(date, timeZone) > until) break;
    if (weekdays.includes(new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay())) dates.push(date);
  }
  return dates;
}
