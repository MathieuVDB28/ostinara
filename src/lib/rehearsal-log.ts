import type {
  PracticeSessionSongEntry,
  RehearsalVerdict,
  SetlistReadiness,
  SetlistReadinessRow,
} from "@/types";

/** Du moins pret au plus pret : l'ordre d'affichage des boutons. */
export const REHEARSAL_VERDICTS: RehearsalVerdict[] = ["rework", "solid", "ready"];

/** Les durees qu'on choisit le plus souvent, en minutes. */
export const REHEARSAL_DURATION_PRESETS = [60, 90, 120, 180];
export const REHEARSAL_DEFAULT_MINUTES = 120;
export const REHEARSAL_MAX_MINUTES = 1440;
export const REHEARSAL_TASK_MAX_LENGTH = 300;

/** Ce qui fait qu'un verdict se lit d'un coup d'oeil. */
export const VERDICT_TEXT_CLASS: Record<RehearsalVerdict, string> = {
  rework: "text-primary",
  solid: "text-foreground",
  ready: "text-success",
};

/**
 * Retrouve un morceau d'une repete a l'autre, et dans la biblio de chacun :
 * « Déjà Vu » et « deja vu » sont le meme morceau.
 */
export function rehearsalSongKey(title: string, artist?: string | null): string {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  return `${normalize(title)}|${normalize(artist ?? "")}`;
}

/**
 * Le temps d'une repete dans le carnet d'un musicien.
 *
 * Il se partage a parts egales entre les morceaux joues. Ce qui n'est pas
 * dans sa biblio va sur la ligne sans morceau : le temps compte, sans lui
 * ajouter un morceau ni consommer sa limite.
 */
export function splitRehearsalMinutes(
  total: number,
  songIds: (string | null)[]
): PracticeSessionSongEntry[] {
  const slots = songIds.length > 0 ? songIds : [null];
  const base = Math.floor(total / slots.length);
  let remainder = total - base * slots.length;

  const minutes = new Map<string | null, number>();
  for (const id of slots) {
    const share = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    minutes.set(id, (minutes.get(id) ?? 0) + share);
  }

  return [...minutes]
    .filter(([, duration]) => duration > 0)
    .map(([song_id, duration_minutes]) => ({ song_id, duration_minutes }));
}

interface ReadinessItem {
  id: string;
  song_title?: string | null;
  song_artist?: string | null;
}

interface PlayedVerdict {
  setlist_item_id: string | null;
  song_key: string;
  verdict: RehearsalVerdict;
  date: string;
}

/**
 * Ou en est chaque morceau d'une setlist : le dernier verdict rendu en repete.
 * La ligne de setlist fait foi, le titre rattrape ce qui a ete ajoute a la main.
 */
export function setlistReadiness(items: ReadinessItem[], played: PlayedVerdict[]): SetlistReadiness {
  const latest = [...played].sort((a, b) => b.date.localeCompare(a.date));

  const rows: SetlistReadinessRow[] = items.map((item) => {
    const title = item.song_title ?? "";
    const artist = item.song_artist ?? null;
    const key = rehearsalSongKey(title, artist);
    const found = latest.find((entry) => entry.setlist_item_id === item.id || entry.song_key === key);
    return {
      item_id: item.id,
      title,
      artist,
      verdict: found?.verdict ?? null,
      date: found?.date ?? null,
    };
  });

  const count = (verdict: RehearsalVerdict) => rows.filter((row) => row.verdict === verdict).length;
  return {
    rows,
    total: rows.length,
    ready: count("ready"),
    solid: count("solid"),
    rework: count("rework"),
    unplayed: rows.filter((row) => !row.verdict).length,
  };
}

interface StatsLog {
  duration_minutes: number | null;
  songs: { song_key: string; song_title: string; song_artist: string | null }[];
}

/** Le groupe en chiffres : ce qu'il a fait ensemble, pas ce qu'il comptait faire. */
export function rehearsalStats(logs: StatsLog[], topCount = 3) {
  const songs = new Map<string, { title: string; artist: string | null; count: number }>();
  for (const log of logs) {
    for (const song of log.songs) {
      const known = songs.get(song.song_key);
      if (known) known.count += 1;
      else songs.set(song.song_key, { title: song.song_title, artist: song.song_artist, count: 1 });
    }
  }

  return {
    count: logs.length,
    minutes: logs.reduce((sum, log) => sum + (log.duration_minutes ?? 0), 0),
    topSongs: [...songs.values()]
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
      .slice(0, topCount),
  };
}

interface FeedActivity {
  id: string;
  type: string;
  reference_id?: string | null;
  user: { id: string; username: string; display_name?: string | null };
  rehearsalCompanions?: { id: string; username: string; display_name?: string | null }[];
}

/**
 * Une meme repete, partagee par plusieurs amis, tient en une entree du feed :
 * « Lea et Tom ont repete ». Le feed ne lit que ce que le lecteur a le droit de
 * voir, donc seuls des amis qui ont choisi de partager y sont nommes.
 */
export function mergeRehearsalActivities<T extends FeedActivity>(activities: T[]): T[] {
  const heads = new Map<string, T>();
  const merged: T[] = [];

  for (const activity of activities) {
    if (activity.type !== "rehearsal_logged" || !activity.reference_id) {
      merged.push(activity);
      continue;
    }
    const head = heads.get(activity.reference_id);
    if (!head) {
      const copy = { ...activity };
      heads.set(activity.reference_id, copy);
      merged.push(copy);
    } else if (head.user.id !== activity.user.id) {
      head.rehearsalCompanions = [...(head.rehearsalCompanions ?? []), activity.user];
    }
  }

  return merged;
}
