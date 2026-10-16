/**
 * L'echelle de tempo.
 *
 * Remplace la barre de progression 0-100 %. Un guitariste ne dit pas
 * « je suis a 64 % sur ce morceau », il dit « je la passe propre a 92 ».
 * L'axe est donc celui de l'instrument : les BPM, gradues aux marques
 * de tempo reelles.
 *
 * La progression est portee par la position ET par le texte de lecture,
 * jamais par la couleur seule.
 */

interface TempoLadderProps {
  /** BPM vise pour le morceau (songs.target_bpm, ou spotify_bpm en repli). */
  targetBpm: number;
  /** Meilleur BPM atteint en session (max de practice_sessions.bpm_achieved). */
  achievedBpm?: number | null;
  /** BPM de depart du travail lent. Par defaut 60 % de la cible. */
  floorBpm?: number;
  /** Masque les marques de tempo pour les emplacements etroits. */
  showScale?: boolean;
  className?: string;
}

/** Marques de tempo classiques — la graduation vient du solfege, pas du design. */
const TEMPO_MARKS = [
  { bpm: 60, name: "Largo" },
  { bpm: 76, name: "Adagio" },
  { bpm: 108, name: "Andante" },
  { bpm: 120, name: "Moderato" },
  { bpm: 168, name: "Allegro" },
  { bpm: 200, name: "Presto" },
];

export function TempoLadder({
  targetBpm,
  achievedBpm,
  floorBpm,
  showScale = true,
  className = "",
}: TempoLadderProps) {
  const floor = floorBpm ?? Math.round(targetBpm * 0.6);
  const achieved = achievedBpm ?? floor;

  // L'echelle englobe toujours la cible, meme au-dela de Presto.
  const min = Math.min(40, floor - 10);
  const max = Math.max(220, targetBpm + 20);
  const pct = (bpm: number) =>
    ((Math.min(Math.max(bpm, min), max) - min) / (max - min)) * 100;

  const atTempo = achieved >= targetBpm;
  const remaining = targetBpm - achieved;
  const marks = TEMPO_MARKS.filter((m) => m.bpm > min && m.bpm < max);
  const labels = stagger(marks.map((mark) => ({ ...mark, left: pct(mark.bpm) })));
  const twoRows = labels.some((label) => label.row === 1);

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tabular text-xl font-bold text-primary">
            {achieved}
          </span>
          <span className="tabular"> / {targetBpm} BPM</span>
        </p>
        <p className="tabular text-xs font-medium text-muted-foreground">
          {atTempo ? "Au tempo" : `Reste ${remaining} BPM`}
        </p>
      </div>

      <div className="relative mt-2 h-6">
        {/* Rail */}
        <div className="absolute inset-x-0 top-2 h-1.5 rounded-full bg-muted" />

        {/* Graduations de tempo */}
        {marks.map((mark) => (
          <div
            key={mark.name}
            className="absolute top-4 h-1.5 w-px bg-input"
            style={{ left: `${pct(mark.bpm)}%` }}
          />
        ))}

        {/* Chemin parcouru, du travail lent au tempo atteint */}
        <div
          className="absolute top-2 h-1.5 rounded-full bg-primary"
          style={{
            left: `${pct(floor)}%`,
            width: `${Math.max(0, pct(achieved) - pct(floor))}%`,
          }}
        />

        {/* Cible */}
        <div
          className="absolute top-0.5 h-4 w-0.5 bg-foreground"
          style={{ left: `${pct(targetBpm)}%` }}
        />

        {/* Repere du tempo atteint — une forme, pas seulement une teinte */}
        <div
          className="absolute top-1 h-3.5 w-3 -translate-x-1/2 rounded-sm bg-primary ring-2 ring-card"
          style={{ left: `${pct(achieved)}%` }}
        />
      </div>

      {showScale && marks.length > 0 && (
        <div className={`relative ${twoRows ? "h-8" : "h-4"}`}>
          {labels.map((mark) => (
            <span
              key={mark.name}
              className={`absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-muted-foreground ${
                mark.row === 1 ? "top-4" : "top-0"
              }`}
              style={{ left: `${mark.left}%` }}
            >
              {mark.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Ecart minimal, en % du rail, entre deux etiquettes d'une meme ligne.
 * Andante (108) et Moderato (120) sont a 12 BPM : sur un telephone, leurs
 * noms se chevauchent. « Moderato » fait ~50 px ; 14 % d'un rail de 320 px
 * en laisse 45 entre deux centres, assez pour deux demi-etiquettes.
 */
const MIN_LABEL_GAP = 14;

/**
 * Une etiquette trop proche de la precedente descend d'une ligne. Les
 * marques arrivent triees par tempo : il suffit de comparer a la derniere
 * etiquette posee sur chaque ligne.
 */
function stagger<T extends { left: number }>(marks: T[]): (T & { row: 0 | 1 })[] {
  const last: [number, number] = [-Infinity, -Infinity];
  return marks.map((mark) => {
    const row: 0 | 1 =
      mark.left - last[0] >= MIN_LABEL_GAP || mark.left - last[0] >= mark.left - last[1] ? 0 : 1;
    last[row] = mark.left;
    return { ...mark, row };
  });
}

/**
 * Repli quand le morceau n'a pas encore de BPM cible : on reste sur le
 * pourcentage, mais avec les tokens de la palette et une lecture chiffree.
 */
export function ProgressBar({
  percent,
  className = "",
}: {
  percent: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <span className="tabular text-sm font-bold text-primary">{percent}%</span>
    </div>
  );
}
