import type { ExerciseCategory, GearType, Instrument, ProfileInstrument, SkillLevel } from "@/types";
import type { EnumsT } from "@/i18n/types";

/**
 * Les instruments qu'Ostinara connait, dans l'ordre d'affichage.
 *
 * `icon` est un nom de la table de src/components/ui/icon.tsx. La basse
 * n'a pas d'icone a elle chez Lucide : elle partage celle de la guitare.
 * Les libelles sont dans messages/<langue>/enums.json (enums.instrument).
 */
export const INSTRUMENTS: { value: Instrument; icon: string }[] = [
  { value: "guitar", icon: "guitar" },
  { value: "bass", icon: "guitar" },
  { value: "drums", icon: "drums" },
  { value: "keys", icon: "piano" },
  { value: "other", icon: "music_note" },
];

export const SKILL_LEVEL_VALUES: SkillLevel[] = ["beginner", "intermediate", "advanced", "expert"];

export const INSTRUMENT_VALUES = INSTRUMENTS.map((i) => i.value);

export function instrumentMeta(value: Instrument) {
  return INSTRUMENTS.find((i) => i.value === value) ?? INSTRUMENTS[INSTRUMENTS.length - 1];
}

/** « Basse », ou ce que le musicien a ecrit pour « autre ». */
export function instrumentLabel(entry: Pick<ProfileInstrument, "instrument" | "custom_label">, t: EnumsT): string {
  if (entry.instrument === "other" && entry.custom_label) return entry.custom_label;
  return t(`instrument.${instrumentMeta(entry.instrument).value}`);
}

export function skillLevelLabel(value: SkillLevel, t: EnumsT): string {
  return SKILL_LEVEL_VALUES.includes(value) ? t(`skillLevel.${value}`) : value;
}

/** L'instrument principal d'abord, puis l'ordre de INSTRUMENTS. */
export function sortInstruments<T extends Pick<ProfileInstrument, "instrument" | "is_primary">>(list: T[]): T[] {
  return [...list].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) ||
      INSTRUMENT_VALUES.indexOf(a.instrument) - INSTRUMENT_VALUES.indexOf(b.instrument),
  );
}

/** Le fragment `select` a joindre a une requete sur profiles. */
export const PROFILE_INSTRUMENTS_SELECT = "instruments:profile_instruments(instrument, level, is_primary, custom_label)";

/** « à la basse », pour une phrase du feed. Vide pour « autre » ou inconnu. */
export function instrumentPhrase(value: unknown, t: EnumsT): string {
  return typeof value === "string" && INSTRUMENT_VALUES.includes(value as Instrument)
    ? t(`instrumentPhrase.${value as Instrument}`)
    : "";
}

/**
 * Les categories d'exercices qui parlent a chaque instrument, dans l'ordre
 * ou on les propose. « Autre » les garde toutes.
 */
export const EXERCISE_CATEGORIES: Record<Instrument, ExerciseCategory[]> = {
  guitar: ["scales", "arpeggios", "picking", "chord_changes", "fingerstyle", "technique", "rhythm"],
  bass: ["grooves", "scales", "arpeggios", "slap", "walking_bass", "technique", "rhythm"],
  drums: ["rudiments", "grooves", "fills", "independence", "technique", "rhythm", "reading"],
  keys: ["scales", "arpeggios", "voicings", "independence", "technique", "reading", "rhythm"],
  other: [
    "scales", "arpeggios", "picking", "chord_changes", "fingerstyle", "technique", "rhythm",
    "rudiments", "grooves", "fills", "independence", "slap", "walking_bass", "voicings", "reading",
  ],
};

/** Toutes les categories d'exercices, dans l'ordre d'affichage. */
export const ALL_EXERCISE_CATEGORIES: ExerciseCategory[] = EXERCISE_CATEGORIES.other;

/** Un exercice vaut-il pour cet instrument ? Liste vide : pour tous. */
export function exerciseFitsInstrument(exercise: { instruments?: Instrument[] | null }, instrument: Instrument): boolean {
  return !exercise.instruments?.length || exercise.instruments.includes(instrument);
}

/** Le poste d'un membre de groupe, en toutes lettres. */
export function bandPosteLabel(
  member: { instrument?: Instrument | null; instrument_label?: string | null },
  t: EnumsT
): string | null {
  if (!member.instrument) return null;
  return instrumentLabel({ instrument: member.instrument, custom_label: member.instrument_label }, t);
}

export interface LineupPoste<M> {
  /** Cle stable : l'instrument, ou « other:chant ». */
  key: string;
  label: string;
  instrument: Instrument;
  members: M[];
}

/**
 * Les postes d'un groupe, dans l'ordre de INSTRUMENTS : chaque « autre »
 * nomme (chant, saxo) fait son propre poste. Les membres sans poste n'y
 * figurent pas.
 */
export function bandLineup<M extends { instrument?: Instrument | null; instrument_label?: string | null }>(
  members: M[],
  t: EnumsT
): LineupPoste<M>[] {
  const postes = new Map<string, LineupPoste<M>>();
  for (const member of members) {
    if (!member.instrument) continue;
    const label = bandPosteLabel(member, t)!;
    const key = member.instrument === "other" ? `other:${label.toLowerCase()}` : member.instrument;
    const poste = postes.get(key) ?? { key, label, instrument: member.instrument, members: [] };
    poste.members.push(member);
    postes.set(key, poste);
  }
  return [...postes.values()].sort(
    (a, b) => INSTRUMENT_VALUES.indexOf(a.instrument) - INSTRUMENT_VALUES.indexOf(b.instrument)
  );
}

/** Le matos propre a chaque instrument. */
const GEAR_FOR: Record<Instrument, GearType[]> = {
  guitar: ["guitar", "amp", "effect"],
  bass: ["bass", "amp", "effect"],
  drums: ["drums", "cymbals"],
  keys: ["keyboard"],
  other: [],
};

const ALL_GEAR: GearType[] = [
  "guitar", "bass", "amp", "effect", "drums", "cymbals", "keyboard", "accessory", "recording", "other",
];

/**
 * Les types de matos, ceux de mes instruments d'abord (principal en tete),
 * puis le reste : un batteur peut aussi avoir une guitare au mur.
 */
export function gearTypesFor(instruments: Instrument[]): GearType[] {
  const first = instruments.flatMap((instrument) => GEAR_FOR[instrument]);
  return [...new Set([...first, ...ALL_GEAR])];
}
