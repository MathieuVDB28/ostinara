/** Les libelles a traduire (namespace `tunings`) ; les autres sont des noms propres. */
export type TuningLabelKey = "bass4" | "bass56" | "bass5" | "bass5HighC" | "bass6";

export interface TuningOption {
  value: string;
  label: string;
  labelKey?: TuningLabelKey;
  notes: string;
  /** Cordes à vide avec octave, de la plus grave à la plus aiguë (utilisé par l'accordeur) */
  pitches: string[];
}

export interface TuningGroup {
  label: string;
  labelKey?: TuningLabelKey;
  tunings: TuningOption[];
}

export const TUNING_GROUPS: TuningGroup[] = [
  {
    label: "Standard & Step Down",
    tunings: [
      { value: "Standard", label: "Standard", notes: "E A D G B E", pitches: ["E2", "A2", "D3", "G3", "B3", "E4"] },
      { value: "Half Step Down", label: "Half Step Down", notes: "Eb Ab Db Gb Bb Eb", pitches: ["Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"] },
      { value: "Full Step Down", label: "Full Step Down", notes: "D G C F A D", pitches: ["D2", "G2", "C3", "F3", "A3", "D4"] },
      { value: "1½ Steps Down", label: "1½ Steps Down", notes: "C# F# B E G# C#", pitches: ["C#2", "F#2", "B2", "E3", "G#3", "C#4"] },
      { value: "2 Steps Down", label: "2 Steps Down", notes: "C F Bb Eb G C", pitches: ["C2", "F2", "Bb2", "Eb3", "G3", "C4"] },
    ],
  },
  {
    label: "Drop Tunings",
    tunings: [
      { value: "Drop D", label: "Drop D", notes: "D A D G B E", pitches: ["D2", "A2", "D3", "G3", "B3", "E4"] },
      { value: "Drop C#", label: "Drop C#", notes: "C# G# C# F# A# D#", pitches: ["C#2", "G#2", "C#3", "F#3", "A#3", "D#4"] },
      { value: "Drop C", label: "Drop C", notes: "C G C F A D", pitches: ["C2", "G2", "C3", "F3", "A3", "D4"] },
      { value: "Drop B", label: "Drop B", notes: "B F# B E G# C#", pitches: ["B1", "F#2", "B2", "E3", "G#3", "C#4"] },
      { value: "Drop Bb", label: "Drop Bb", notes: "Bb F Bb Eb G C", pitches: ["Bb1", "F2", "Bb2", "Eb3", "G3", "C4"] },
      { value: "Drop A", label: "Drop A", notes: "A E A D F# B", pitches: ["A1", "E2", "A2", "D3", "F#3", "B3"] },
    ],
  },
  {
    label: "Open Tunings",
    tunings: [
      { value: "Open D", label: "Open D", notes: "D A D F# A D", pitches: ["D2", "A2", "D3", "F#3", "A3", "D4"] },
      { value: "Open E", label: "Open E", notes: "E B E G# B E", pitches: ["E2", "B2", "E3", "G#3", "B3", "E4"] },
      { value: "Open G", label: "Open G", notes: "D G D G B D", pitches: ["D2", "G2", "D3", "G3", "B3", "D4"] },
      { value: "Open A", label: "Open A", notes: "E A E A C# E", pitches: ["E2", "A2", "E3", "A3", "C#4", "E4"] },
      { value: "Open C", label: "Open C", notes: "C G C G C E", pitches: ["C2", "G2", "C3", "G3", "C4", "E4"] },
      { value: "Open Em", label: "Open Em", notes: "E B E G B E", pitches: ["E2", "B2", "E3", "G3", "B3", "E4"] },
      { value: "Open Dm", label: "Open Dm", notes: "D A D F A D", pitches: ["D2", "A2", "D3", "F3", "A3", "D4"] },
    ],
  },
  {
    label: "Other Tunings",
    tunings: [
      { value: "DADGAD", label: "DADGAD", notes: "D A D G A D", pitches: ["D2", "A2", "D3", "G3", "A3", "D4"] },
      { value: "Double Drop D", label: "Double Drop D", notes: "D A D G B D", pitches: ["D2", "A2", "D3", "G3", "B3", "D4"] },
      { value: "C6", label: "C6", notes: "C A C G C E", pitches: ["C2", "A2", "C3", "G3", "C4", "E4"] },
      { value: "New Standard", label: "New Standard (NST)", notes: "C G D A E G", pitches: ["C2", "G2", "D3", "A3", "E4", "G4"] },
    ],
  },
];

/**
 * Les accordages de basse, pour l'accordeur. Les noms reprennent ceux de la
 * guitare (un morceau en drop D l'est aux deux instruments) : `value` reste
 * celui de TUNING_GROUPS quand il existe.
 */
export const BASS_TUNING_GROUPS: TuningGroup[] = [
  {
    label: "4 cordes",
    labelKey: "bass4",
    tunings: [
      { value: "Standard", label: "Standard", notes: "E A D G", pitches: ["E1", "A1", "D2", "G2"] },
      { value: "Half Step Down", label: "Half Step Down", notes: "Eb Ab Db Gb", pitches: ["Eb1", "Ab1", "Db2", "Gb2"] },
      { value: "Full Step Down", label: "Full Step Down", notes: "D G C F", pitches: ["D1", "G1", "C2", "F2"] },
      { value: "Drop D", label: "Drop D", notes: "D A D G", pitches: ["D1", "A1", "D2", "G2"] },
      { value: "Drop C", label: "Drop C", notes: "C G C F", pitches: ["C1", "G1", "C2", "F2"] },
    ],
  },
  {
    label: "5 et 6 cordes",
    labelKey: "bass56",
    tunings: [
      { value: "Standard 5", label: "5 cordes", labelKey: "bass5", notes: "B E A D G", pitches: ["B0", "E1", "A1", "D2", "G2"] },
      { value: "High C 5", label: "5 cordes, Do aigu", labelKey: "bass5HighC", notes: "E A D G C", pitches: ["E1", "A1", "D2", "G2", "C3"] },
      { value: "Standard 6", label: "6 cordes", labelKey: "bass6", notes: "B E A D G C", pitches: ["B0", "E1", "A1", "D2", "G2", "C3"] },
    ],
  },
];

// Flat list of all tuning values (for validation, filters, etc.)
export const ALL_TUNINGS = TUNING_GROUPS.flatMap((g) => g.tunings.map((t) => t.value));

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Fréquence (Hz) d'une note avec octave, ex. "C#2", "Bb1" — La4 = 440 Hz */
export function pitchToFrequency(pitch: string): number {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(pitch);
  if (!match) throw new Error(`Invalid pitch: ${pitch}`);
  const [, letter, accidental, octave] = match;
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const midi = 12 * (Number(octave) + 1) + SEMITONES[letter] + offset;
  return Math.round(440 * Math.pow(2, (midi - 69) / 12) * 100) / 100;
}
