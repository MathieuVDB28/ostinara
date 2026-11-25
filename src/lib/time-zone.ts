/**
 * L'heure « au mur » d'un fuseau, et retour. Le serveur tourne en UTC : une
 * repete a 20 h reste a 20 h au changement d'heure, quel que soit l'ecart.
 */

export const DEFAULT_TIME_ZONE = "Europe/Paris";

/** Une date et une heure telles qu'on les lit sur place. `month` : 1 a 12. */
export interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Le fuseau recu du navigateur, ou celui de Paris s'il n'existe pas. */
export function safeTimeZone(value: string | null | undefined): string {
  if (!value) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Le fuseau de l'appareil (cote navigateur). */
export function deviceTimeZone(): string {
  return safeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

export function toWallTime(date: Date, timeZone: string): WallTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

function wallMs(wall: WallTime): number {
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
}

/** L'instant de cette heure au mur. Une heure sautee au printemps est repoussee d'autant. */
export function fromWallTime(wall: WallTime, timeZone: string): Date {
  const target = wallMs(wall);
  const offsetAt = (ms: number) => wallMs(toWallTime(new Date(ms), timeZone)) - ms;
  const first = target - offsetAt(target);
  const second = target - offsetAt(first);
  // Les deux essais different autour d'un changement d'heure : on garde celui qui retombe juste.
  if (wallMs(toWallTime(new Date(second), timeZone)) === target) return new Date(second);
  return new Date(Math.max(first, second));
}

/** YYYY-MM-DD, au mur. */
export function wallDateKey(date: Date, timeZone: string): string {
  const { year, month, day } = toWallTime(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Le jour decale de `days`, meme heure au mur. */
export function shiftWallDays(wall: WallTime, days: number): WallTime {
  const shifted = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + days));
  return { ...wall, year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** Ecart en jours de calendrier. */
export function wallDaysBetween(from: WallTime, to: WallTime): number {
  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86_400_000
  );
}
