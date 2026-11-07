import type { Translator } from "@/i18n/types";
import type {
  BandSongDefaults,
  MusicalMode,
  PlayedSection,
  SetlistItemWithSongOwner,
} from "@/types";

/** Ce que les setlists et la jam lisent de la fiche. */
export const BAND_SONG_DEFAULT_COLUMNS = "id, key_note, key_mode, bpm, tuning, capo, structure, tabs_url";

/** Les douze notes, de do a si : l'index est `key_note`. */
export const KEY_NOTES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
export const KEY_MODES: MusicalMode[] = ["major", "minor"];

export const BAND_SONG_NOTES_MAX = 4000;
export const BAND_SONG_MEMBER_NOTE_MAX = 2000;
export const BAND_SONG_URL_MAX = 2000;
export const BAND_SONG_MAX_PARTS = 40;
export const BAND_SONG_MAX_MEASURES = 512;

export type RepertoireT = Translator<"repertoire">;

/** « Mi mineur », « E minor » ; rien sans note. */
export function formatMusicalKey(
  note: number | null | undefined,
  mode: MusicalMode | null | undefined,
  t: RepertoireT
): string | null {
  if (note === null || note === undefined) return null;
  const name = t(`notes.n${note as (typeof KEY_NOTES)[number]}`);
  return mode ? t("keyWithMode", { note: name, mode: t(`modes.${mode}`) }) : name;
}

export interface StructurePart {
  name: string;
  measures: number;
}

/** Les sections a la suite, chacune avec son nombre de mesures. */
export function partsFromSections(sections: PlayedSection[] | null | undefined): StructurePart[] {
  return (sections ?? []).map((section) => ({
    name: section.name,
    measures: Math.max(1, section.endMeasure - section.startMeasure + 1),
  }));
}

/** L'inverse : les mesures se suivent depuis la premiere. */
export function sectionsFromParts(parts: StructurePart[]): PlayedSection[] {
  let start = 1;
  return parts
    .filter((part) => part.name.trim() && part.measures >= 1)
    .map((part) => {
      const section = { name: part.name.trim(), startMeasure: start, endMeasure: start + part.measures - 1 };
      start += part.measures;
      return section;
    });
}

/** Une structure lisible et bornee, telle qu'elle peut entrer en base. */
export function sanitizeStructure(sections: unknown): PlayedSection[] | null {
  if (!Array.isArray(sections) || sections.length > BAND_SONG_MAX_PARTS) return null;
  const clean: PlayedSection[] = [];
  for (const raw of sections) {
    const section = raw as Partial<PlayedSection>;
    const name = typeof section?.name === "string" ? section.name.trim().slice(0, 60) : "";
    const start = Number(section?.startMeasure);
    const end = Number(section?.endMeasure);
    if (!name || !Number.isInteger(start) || !Number.isInteger(end)) return null;
    if (start < 1 || end < start || end > BAND_SONG_MAX_MEASURES) return null;
    clean.push({ name, startMeasure: start, endMeasure: end });
  }
  return clean;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Ce qu'une ligne de setlist joue vraiment : ses propres valeurs, sinon
 * celles de la fiche du repertoire.
 */
export function withBandSongDefaults<T extends SetlistItemWithSongOwner>(item: T): T {
  const fiche: BandSongDefaults | null | undefined = item.band_song;
  if (!fiche || item.item_type !== "song") return item;
  return {
    ...item,
    bpm: item.bpm || fiche.bpm || undefined,
    tabs_url: item.tabs_url || fiche.tabs_url || undefined,
    played_sections:
      item.played_sections && item.played_sections.length > 0 ? item.played_sections : fiche.structure ?? [],
  };
}

/** Le chemin de la fiche d'un morceau du repertoire. */
export function bandSongHref(bandId: string, bandSongId: string): string {
  return `/commu/groupes/${bandId}/repertoire/${bandSongId}`;
}
