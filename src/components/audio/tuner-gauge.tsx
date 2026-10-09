"use client";

interface TunerGaugeProps {
  cents: number; // -50 to 50
}

// Une graduation tous les 10 cents, de -50 a +50.
const TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
const CX = 145;
const CY = 150;

function polar(cents: number, radius: number) {
  const rad = ((cents * 0.9 - 90) * Math.PI) / 180;
  return { x: CX + Math.cos(rad) * radius, y: CY + Math.sin(rad) * radius };
}

/**
 * Le cadran de l'accordeur, style Atelier (docs/refonte-ui.md) : des
 * graduations comme sur un accordeur a aiguille, le zero en vert.
 *
 * Trois zones : juste, approchant, faux. Les jetons du theme portent deja
 * cette semantique et s'adaptent aux deux apparences ; l'aiguille et la
 * lecture en cents les prennent, la forme (position de l'aiguille) porte
 * l'information avant la teinte.
 */
export function TunerGauge({ cents }: TunerGaugeProps) {
  const clampedCents = Math.max(-50, Math.min(50, cents));
  const angle = clampedCents * 0.9;

  const absCents = Math.abs(clampedCents);
  const color = absCents <= 5 ? "text-success" : absCents <= 15 ? "text-primary" : "text-destructive";

  return (
    <div className="flex w-full flex-col items-center">
      <svg viewBox="0 0 290 162" className="w-full max-w-[290px]" aria-hidden="true">
        {TICKS.map((tick) => {
          const major = tick % 50 === 0 || tick === 0;
          const outer = polar(tick, 118);
          const inner = polar(tick, major ? 98 : 108);
          return (
            <line
              key={tick}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              stroke="currentColor"
              strokeWidth={tick === 0 ? 3 : 1.5}
              strokeLinecap="round"
              className={tick === 0 ? "text-success" : "text-muted-foreground"}
            />
          );
        })}

        <text x="22" y="158" className="fill-muted-foreground font-mono text-[10px]">−50</text>
        <text x="246" y="158" className="fill-muted-foreground font-mono text-[10px]">+50</text>

        <g
          transform={`rotate(${angle}, ${CX}, ${CY})`}
          className={`transition-transform duration-150 ease-out ${color}`}
        >
          <line x1={CX} y1={CY} x2={CX} y2={44} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx={CX} cy={CY} r="6" className="fill-foreground" />
      </svg>

      <p className={`tabular mt-1 font-mono text-xs font-semibold ${color}`}>
        {clampedCents > 0 ? "+" : ""}
        {clampedCents} cents
      </p>
    </div>
  );
}
