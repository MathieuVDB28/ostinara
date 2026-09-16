"use client";

import { useMemo } from "react";
import type { SongBpmPoint } from "@/types";

/**
 * La courbe BPM/temps d'un morceau.
 *
 * « 60 % » ne dit rien. « 88 BPM le 3 mars, 104 le 18 » dit tout : la
 * pente, le plafond, et les deux semaines ou l'on n'a pas touche
 * l'instrument. C'est la seule mesure de progression que l'app possede
 * reellement.
 *
 * En SVG a la main plutot qu'en recharts : cette courbe vit dans la fiche
 * d'un morceau, et recharts pese ~380 Ko qu'on ne va pas charger pour
 * tracer une polyligne de douze points.
 */

interface SongBpmCurveProps {
  points: SongBpmPoint[];
  /** Le tempo vise — trace en pointilles au-dessus de la courbe. */
  targetBpm?: number | null;
  /** Le depart du travail lent, borne basse de l'echelle. */
  floorBpm?: number | null;
  className?: string;
}

const WIDTH = 320;
const HEIGHT = 96;
const PADDING = { top: 10, right: 6, bottom: 4, left: 6 };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function SongBpmCurve({
  points,
  targetBpm,
  floorBpm,
  className = "",
}: SongBpmCurveProps) {
  const chart = useMemo(() => {
    if (points.length === 0) return null;

    const bpms = points.map((point) => point.bpm);
    // L'echelle englobe toujours la cible : une courbe qui s'arrete a son
    // maximum donne l'illusion d'etre arrivee.
    const candidates = [...bpms, targetBpm, floorBpm].filter(
      (value): value is number => typeof value === "number"
    );
    const rawMin = Math.min(...candidates);
    const rawMax = Math.max(...candidates);
    // Un seul point, ou un plateau parfait : il faut quand meme une hauteur.
    const span = Math.max(8, rawMax - rawMin);
    const min = rawMin - span * 0.12;
    const max = rawMax + span * 0.12;

    const innerWidth = WIDTH - PADDING.left - PADDING.right;
    const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

    const x = (index: number) =>
      points.length === 1
        ? PADDING.left + innerWidth / 2
        : PADDING.left + (index / (points.length - 1)) * innerWidth;

    const y = (bpm: number) =>
      PADDING.top + innerHeight - ((bpm - min) / (max - min)) * innerHeight;

    const coords = points.map((point, index) => ({
      ...point,
      x: x(index),
      y: y(point.bpm),
    }));

    const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const area = `${PADDING.left},${HEIGHT - PADDING.bottom} ${line} ${
      coords[coords.length - 1].x.toFixed(1)
    },${HEIGHT - PADDING.bottom}`;

    return {
      coords,
      line,
      area,
      targetY: typeof targetBpm === "number" ? y(targetBpm) : null,
      first: points[0],
      last: points[points.length - 1],
      best: Math.max(...bpms),
    };
  }, [points, targetBpm, floorBpm]);

  if (!chart) {
    return (
      <div
        className={`rounded-xl border border-dashed border-border p-4 text-center ${className}`}
      >
        <p className="text-sm text-muted-foreground">
          Aucun tempo enregistré pour ce morceau
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Note le BPM atteint à la fin d&apos;une session : c&apos;est ce qui
          trace la progression.
        </p>
      </div>
    );
  }

  const gain = chart.last.bpm - chart.first.bpm;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tabular text-xl font-bold text-primary">
            {chart.last.bpm}
          </span>
          <span className="tabular"> BPM</span>
          {targetBpm ? (
            <span className="tabular text-muted-foreground"> / {targetBpm}</span>
          ) : null}
        </p>
        {points.length > 1 && (
          <p className="tabular text-xs font-medium text-muted-foreground">
            {gain >= 0 ? "+" : ""}
            {gain} BPM depuis le {formatDate(chart.first.date)}
          </p>
        )}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`Courbe de tempo : ${points.length} session${
          points.length > 1 ? "s" : ""
        }, de ${chart.first.bpm} à ${chart.last.bpm} BPM${
          targetBpm ? `, cible ${targetBpm} BPM` : ""
        }`}
      >
        {/* La cible, en pointilles : une ligne a atteindre, pas une donnee. */}
        {chart.targetY !== null && (
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={chart.targetY}
            y2={chart.targetY}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="4 4"
            className="text-foreground/40"
          />
        )}

        <polygon points={chart.area} className="fill-primary/10" />

        <polyline
          points={chart.line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />

        {chart.coords.map((coord) => (
          <circle
            key={`${coord.date}-${coord.bpm}`}
            cx={coord.x}
            cy={coord.y}
            r={coord.bpm === chart.best ? 3.5 : 2}
            className={
              coord.bpm === chart.best
                ? "fill-primary stroke-card"
                : "fill-primary/60"
            }
            strokeWidth={1.5}
          />
        ))}
      </svg>

      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">
          {formatDate(chart.first.date)}
        </span>
        <span className="tabular text-[11px] text-muted-foreground">
          Meilleur : {chart.best} BPM
        </span>
        <span className="text-[11px] text-muted-foreground">
          {formatDate(chart.last.date)}
        </span>
      </div>
    </div>
  );
}
