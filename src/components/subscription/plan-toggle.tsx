"use client";

import { BillingInterval } from "@/lib/stripe/config";

interface PlanToggleProps {
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
}

export function PlanToggle({ interval, onIntervalChange }: PlanToggleProps) {
  // Un controle segmente, comme les sections de Biblio : deux choix
  // nommes plutot qu'un interrupteur entre deux libelles.
  const options = [
    { value: "monthly" as const, label: "Mensuel" },
    { value: "yearly" as const, label: "Annuel" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Facturation"
      className="inline-grid grid-cols-2 gap-0.5 rounded-xl border border-border bg-card p-[3px]"
    >
      {options.map((option) => {
        const isActive = interval === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onIntervalChange(option.value)}
            className={`flex min-h-[36px] items-center justify-center gap-1.5 rounded-[9px] px-4 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-secondary text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
            {option.value === "yearly" && (
              <span className="tabular font-mono text-[10.5px] font-semibold text-success">−20%</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
