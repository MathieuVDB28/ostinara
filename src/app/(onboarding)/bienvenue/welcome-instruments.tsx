"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { InstrumentPicker } from "@/components/instruments/instrument-picker";

export function WelcomeInstruments({ limit }: { limit: number | null }) {
  const t = useTranslations("instruments.welcome");
  const router = useRouter();

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-[0.9]">
          {t("title")}
        </h1>
        <p className="mt-3 font-serif text-lg italic leading-relaxed text-foreground/80">
          {t("lead")}
        </p>
      </div>

      <InstrumentPicker
        initial={[]}
        limit={limit}
        submitLabel={t("submit")}
        onSaved={() => router.replace("/accueil")}
      />
    </div>
  );
}
