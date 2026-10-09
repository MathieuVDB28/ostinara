import type { HeatmapData, HeatmapDay } from "@/types";

interface PracticeCalendarProps {
  data: HeatmapData;
  className?: string;
}

/*
 * Cinq niveaux, du fond a l'ambre plein. L'ambre est ici a sa place :
 * il mesure du temps passe a jouer, c'est-a-dire du tempo.
 */
const LEVEL_CLASS: Record<HeatmapDay["level"], string> = {
  0: "bg-muted",
  1: "bg-[color-mix(in_srgb,var(--primary)_30%,var(--muted))]",
  2: "bg-[color-mix(in_srgb,var(--primary)_55%,var(--muted))]",
  3: "bg-[color-mix(in_srgb,var(--primary)_80%,var(--muted))]",
  4: "bg-primary",
};

function parseDay(date: string) {
  return new Date(`${date}T12:00:00`);
}

/**
 * Le calendrier de pratique du Carnet (style Atelier).
 *
 * Une colonne par semaine, du lundi au dimanche, la plus recente a
 * droite. La regularite se lit d'un coup d'oeil, avant les chiffres.
 */
export function PracticeCalendar({ data, className = "" }: PracticeCalendarProps) {
  const { days } = data;
  if (days.length === 0) return null;

  // La premiere colonne commence un lundi : on comble les jours d'avant.
  const offset = (parseDay(days[0].date).getDay() + 6) % 7;
  const cells: (HeatmapDay | null)[] = [...Array<null>(offset).fill(null), ...days];
  const weeks = Math.ceil(cells.length / 7);

  // Un repere de mois sur la colonne ou il commence.
  const months: { column: number; label: string }[] = [];
  cells.forEach((day, index) => {
    if (!day) return;
    const date = parseDay(day.date);
    const column = Math.floor(index / 7);
    const previous = months[months.length - 1];
    if (date.getDate() <= 7 && (!previous || previous.column < column - 1)) {
      months.push({
        column,
        label: date.toLocaleDateString("fr-FR", { month: "short" }),
      });
    }
  });

  return (
    <figure className={`max-w-[440px] ${className}`}>
      <div
        className="grid grid-flow-col grid-rows-7 gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {cells.map((day, index) =>
          day ? (
            <span
              key={day.date}
              title={`${parseDay(day.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · ${
                day.minutes > 0 ? `${day.minutes} min` : "pas joué"
              }`}
              className={`aspect-square rounded-[2px] ${LEVEL_CLASS[day.level]}`}
            />
          ) : (
            <span key={`pad-${index}`} aria-hidden="true" />
          )
        )}
      </div>

      <div
        aria-hidden="true"
        className="mt-1.5 grid font-mono text-[10px] text-muted-foreground"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {months.map((month) => (
          <span key={month.column} style={{ gridColumnStart: month.column + 1 }} className="whitespace-nowrap">
            {month.label}
          </span>
        ))}
      </div>

      <figcaption className="sr-only">
        {data.activeDays} jours joués sur les {data.totalDays} derniers.
      </figcaption>
    </figure>
  );
}
