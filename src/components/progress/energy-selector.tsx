"use client";

import type { EnergyLevel } from "@/types";

interface EnergyOption {
  value: EnergyLevel;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const energyLevels: EnergyOption[] = [
  {
    value: "low",
    label: "Faible",
    color: "text-blue-400",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
      </svg>
    ),
  },
  {
    value: "medium",
    label: "Normal",
    color: "text-yellow-400",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
      </svg>
    ),
  },
  {
    value: "high",
    label: "Plein d'énergie",
    color: "text-green-400",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
];

interface EnergySelectorProps {
  value: EnergyLevel | null;
  onChange: (energy: EnergyLevel | null) => void;
}

export function EnergySelector({ value, onChange }: EnergySelectorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {energyLevels.map((energy) => {
        const isSelected = value === energy.value;

        return (
          <button
            key={energy.value}
            type="button"
            onClick={() => onChange(isSelected ? null : energy.value)}
            className={`
              flex flex-col items-center gap-1 px-4 py-2 rounded-xl
              transition-all duration-200
              ${isSelected
                ? `bg-primary/20 ring-2 ring-primary ${energy.color}`
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }
            `}
            title={energy.label}
          >
            {energy.icon}
            <span className="text-xs font-medium">{energy.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function getEnergyLabel(energy: EnergyLevel | null): string {
  if (!energy) return "";
  return energyLevels.find(e => e.value === energy)?.label || "";
}
