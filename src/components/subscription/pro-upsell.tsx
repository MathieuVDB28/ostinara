"use client";

import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";

interface ProUpsellProps {
  feature: string;
  description: string;
  compact?: boolean;
}

export function ProUpsell({ feature, description, compact }: ProUpsellProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 border-y border-border py-2 text-sm">
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
        <span className="text-muted-foreground">{feature}</span>
        <Link
          href="/pricing"
          className="ml-auto shrink-0 rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-background"
        >
          Pro
        </Link>
      </div>
    );
  }

  return (
    <div className="border-y border-border py-5">
      <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Lock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        Plans Pro et Band
      </p>
      <h3 className="mt-2 font-display text-2xl font-extrabold uppercase leading-none">{feature}</h3>
      <p className="mb-4 mt-1.5 text-sm text-muted-foreground">{description}</p>
      <Link
        href="/pricing"
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Passer Pro
        <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      </Link>
    </div>
  );
}
