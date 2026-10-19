/**
 * Les rappels de pratique : quel rappel envoyer aujourd'hui a quelqu'un,
 * s'il y en a un.
 *
 * Fonction pure, sans base ni reseau : le cron rassemble les donnees, ce
 * module decide. Un seul rappel par jour, le plus pressant, et jamais le
 * meme morceau deux fois dans la semaine — un rappel qu'on recoit trop
 * souvent fait couper les notifications, et avec elles les demandes
 * d'amis.
 */

import type { PushT } from "./send-push";

export type ReminderType = "reminder_streak" | "reminder_plan" | "reminder_song" | "reminder_pause";

export const REMINDER_TYPES: ReminderType[] = [
  "reminder_streak",
  "reminder_plan",
  "reminder_song",
  "reminder_pause",
];

/** Une serie s'annonce en danger a partir de ce nombre de jours. */
const STREAK_MIN = 3;
/** Un morceau en cours est « delaisse » apres ce nombre de jours sans session. */
const SONG_IDLE_DAYS = 10;
/** On ne relance pas sur le meme morceau avant ce delai. */
const SONG_COOLDOWN_DAYS = 7;
/** Pas de session depuis ce nombre de jours : « ca fait longtemps ». */
const PAUSE_DAYS = 4;
/** Entre deux rappels de pause. */
const PAUSE_COOLDOWN_DAYS = 3;
/** Le rappel du plan part le jeudi : il reste trois jours pour agir. */
const PLAN_WEEKDAY = 4;

export interface ReminderInput {
  /** Aujourd'hui, en date de Paris (YYYY-MM-DD). */
  today: string;
  /** Jour de la semaine a Paris, 0 = dimanche. */
  weekday: number;
  /** Dates (YYYY-MM-DD, Paris) des jours joues, sans doublon. */
  practiceDays: Set<string>;
  /** Morceaux en cours, avec la derniere date ou ils ont ete joues. */
  learningSongs: { id: string; title: string; lastPlayed: string | null; since: string }[];
  /** Objectifs du plan de la semaine pas encore atteints (titres). */
  remainingGoals: string[];
  /** Rappels deja envoyes ces derniers jours. */
  recent: { type: string; date: string; songId?: string }[];
}

export interface Reminder {
  type: ReminderType;
  /** Le texte, ecrit dans la langue du destinataire au moment de l'envoi. */
  text: (t: PushT) => { title: string; body: string };
  url: string;
  songId?: string;
}

/** Ecart en jours entre deux dates YYYY-MM-DD. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function shift(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Jours consecutifs joues jusqu'a hier inclus. */
export function streakUntilYesterday(days: Set<string>, today: string): number {
  let count = 0;
  let cursor = shift(today, -1);
  while (days.has(cursor)) {
    count++;
    cursor = shift(cursor, -1);
  }
  return count;
}

export function pickReminder(input: ReminderInput): Reminder | null {
  const { today, weekday, practiceDays, learningSongs, remainingGoals, recent } = input;

  // Un rappel par jour, toutes regles confondues.
  if (recent.some((r) => r.date === today)) return null;

  // Deja joue aujourd'hui : rien a rappeler.
  if (practiceDays.has(today)) return null;

  const lastSent = (type: ReminderType) =>
    recent
      .filter((r) => r.type === type)
      .reduce<string | null>((latest, r) => (!latest || r.date > latest ? r.date : latest), null);

  // 1. Serie en danger — le plus pressant : elle se perd ce soir.
  const streak = streakUntilYesterday(practiceDays, today);
  if (streak >= STREAK_MIN) {
    return {
      type: "reminder_streak",
      text: (t) => ({ title: t("reminder.streakTitle", { count: streak }), body: t("reminder.streakBody") }),
      url: "/jouer",
    };
  }

  // 2. Le plan de la semaine, le jeudi.
  if (weekday === PLAN_WEEKDAY && remainingGoals.length > 0) {
    const n = remainingGoals.length;
    return {
      type: "reminder_plan",
      text: (t) => ({
        title: t("reminder.planTitle", { count: n }),
        body: t("reminder.planBody", { goal: remainingGoals[0] }),
      }),
      url: "/jouer",
    };
  }

  // 3. Le morceau en cours le plus delaisse, s'il n'a pas eu son rappel
  //    cette semaine.
  const nudgedSongs = new Set(
    recent
      .filter((r) => r.type === "reminder_song" && r.songId && daysBetween(r.date, today) < SONG_COOLDOWN_DAYS)
      .map((r) => r.songId)
  );
  const idle = learningSongs
    .map((song) => ({ song, idle: daysBetween(song.lastPlayed ?? song.since, today) }))
    .filter(({ song, idle }) => idle >= SONG_IDLE_DAYS && !nudgedSongs.has(song.id))
    .sort((a, b) => b.idle - a.idle)[0];

  if (idle) {
    return {
      type: "reminder_song",
      text: (t) => ({
        title: t("reminder.songTitle", { title: idle.song.title }),
        body: idle.song.lastPlayed
          ? t("reminder.songIdleBody", { count: idle.idle })
          : t("reminder.songNeverBody", { count: idle.idle }),
      }),
      url: `/jouer?song=${idle.song.id}`,
      songId: idle.song.id,
    };
  }

  // 4. Une pause qui dure — seulement pour qui a deja joue.
  const lastPlayed = [...practiceDays].sort().pop();
  if (lastPlayed) {
    const pause = daysBetween(lastPlayed, today);
    const lastPause = lastSent("reminder_pause");
    if (pause >= PAUSE_DAYS && (!lastPause || daysBetween(lastPause, today) >= PAUSE_COOLDOWN_DAYS)) {
      return {
        type: "reminder_pause",
        text: (t) => ({ title: t("reminder.pauseTitle", { count: pause }), body: t("reminder.pauseBody") }),
        url: "/jouer",
      };
    }
  }

  return null;
}
