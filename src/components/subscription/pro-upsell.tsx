"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Lock } from "lucide-react";

interface ProUpsellProps {
  feature: string;
  description: string;
  compact?: boolean;
  /** Le plan qui debloque la fonction : un Pro n'ouvre ni jam ni chat de groupe. */
  plan?: "pro" | "band";
}

export function ProUpsell({ feature, description, compact, plan = "pro" }: ProUpsellProps) {
  const t = useTranslations("plans.upsell");
  const copy =
    plan === "band"
      ? { tag: t("bandTag"), eyebrow: t("bandEyebrow"), cta: t("bandCta") }
      : { tag: t("proTag"), eyebrow: t("proEyebrow"), cta: t("proCta") };

  if (compact) {
    return (
      <div className="flex items-center gap-2 border-y border-border py-2 text-sm">
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
        <span className="text-muted-foreground">{feature}</span>
        <Link
          href="/pricing"
          className="ml-auto shrink-0 rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-background"
        >
          {copy.tag}
        </Link>
      </div>
    );
  }

  return (
    <div className="border-y border-border py-5">
      <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Lock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        {copy.eyebrow}
      </p>
      <h3 className="mt-2 font-display text-2xl font-extrabold uppercase leading-none">{feature}</h3>
      <p className="mb-4 mt-1.5 text-sm text-muted-foreground">{description}</p>
      <Link
        href="/pricing"
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {copy.cta}
        <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      </Link>
    </div>
  );
}
