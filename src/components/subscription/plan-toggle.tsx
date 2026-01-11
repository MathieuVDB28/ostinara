"use client";

import { BillingInterval } from "@/lib/stripe/config";

interface PlanToggleProps {
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
}

export function PlanToggle({ interval, onIntervalChange }: PlanToggleProps) {
  const handleToggle = () => {
    onIntervalChange(interval === "monthly" ? "yearly" : "monthly");
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={handleToggle}
        className={`text-sm transition-colors ${
          interval === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"
        }`}
      >
        Mensuel
      </button>
      <button
        type="button"
        onClick={handleToggle}
        className={`relative h-7 w-14 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
          interval === "yearly"
            ? "bg-primary border-primary"
            : "bg-muted/50 border-border"
        }`}
        role="switch"
        aria-checked={interval === "yearly"}
        aria-label={`Passer à la facturation ${interval === "monthly" ? "annuelle" : "mensuelle"}`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            interval === "yearly" ? "translate-x-7" : "translate-x-0"
          }`}
        />
      </button>
      <button
        type="button"
        onClick={handleToggle}
        className={`text-sm transition-colors ${
          interval === "yearly" ? "text-foreground font-medium" : "text-muted-foreground"
        }`}
      >
        Annuel
        <span className="ml-1.5 inline-flex items-center rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
          -20%
        </span>
      </button>
    </div>
  );
}
