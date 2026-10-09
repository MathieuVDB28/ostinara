interface FretsProps {
  /** Avancee, de 0 a 100. */
  value: number;
  /** Lu par les lecteurs d'ecran, ex. « 88 sur 104 BPM ». */
  label?: string;
  className?: string;
}

const FRET_COUNT = 12;

/**
 * La progression en douze cases, une par frette jusqu'a l'octave.
 *
 * Remplace la barre de progression generique dans le style Atelier
 * (docs/refonte-ui.md). La valeur se lit au nombre de cases pleines,
 * pas seulement a la teinte.
 */
export function Frets({ value, label, className = "" }: FretsProps) {
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * FRET_COUNT);

  return (
    <span className={`inline-grid grid-cols-[repeat(12,4px)] gap-0.5 ${className}`}>
      {label && <span className="sr-only">{label}</span>}
      {Array.from({ length: FRET_COUNT }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-2 rounded-[1px] ${i < filled ? "bg-primary" : "bg-muted"}`}
        />
      ))}
    </span>
  );
}
