"use client";

interface TunerGaugeProps {
  cents: number; // -50 to 50
}

export function TunerGauge({ cents }: TunerGaugeProps) {
  // Map cents (-50 to 50) to angle (-90 to 90 degrees)
  const clampedCents = Math.max(-50, Math.min(50, cents));
  const angle = (clampedCents / 50) * 90;

  // Color based on deviation
  const absCents = Math.abs(clampedCents);
  let color: string;
  if (absCents <= 5) {
    color = "text-green-400";
  } else if (absCents <= 15) {
    color = "text-yellow-400";
  } else {
    color = "text-red-400";
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-xs">
        {/* Background arc */}
        <path
          d="M 20 110 A 80 80 0 0 1 180 110"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/50"
        />

        {/* Red zone left */}
        <path
          d="M 20 110 A 80 80 0 0 1 47 52"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-red-500/40"
        />

        {/* Yellow zone left */}
        <path
          d="M 47 52 A 80 80 0 0 1 72 36"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-yellow-500/40"
        />

        {/* Green zone center */}
        <path
          d="M 72 36 A 80 80 0 0 1 128 36"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-green-500/40"
        />

        {/* Yellow zone right */}
        <path
          d="M 128 36 A 80 80 0 0 1 153 52"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-yellow-500/40"
        />

        {/* Red zone right */}
        <path
          d="M 153 52 A 80 80 0 0 1 180 110"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-red-500/40"
        />

        {/* Center tick mark */}
        <line
          x1="100"
          y1="28"
          x2="100"
          y2="38"
          stroke="currentColor"
          strokeWidth="2"
          className="text-green-400"
        />

        {/* Needle */}
        <g
          transform={`rotate(${angle}, 100, 110)`}
          className="transition-transform duration-150 ease-out"
        >
          <line
            x1="100"
            y1="110"
            x2="100"
            y2="38"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={color}
          />
          <circle cx="100" cy="110" r="5" fill="currentColor" className={color} />
        </g>

        {/* Labels */}
        <text x="15" y="118" className="fill-muted-foreground text-[10px]">
          ♭
        </text>
        <text x="95" y="22" className="fill-green-400 text-[10px]" textAnchor="middle">
          ✓
        </text>
        <text x="183" y="118" className="fill-muted-foreground text-[10px]">
          ♯
        </text>
      </svg>

      {/* Cents display */}
      <div className="mt-2 text-center">
        <span className={`text-sm font-medium ${color}`}>
          {clampedCents > 0 ? "+" : ""}
          {clampedCents} cents
        </span>
      </div>
    </div>
  );
}
