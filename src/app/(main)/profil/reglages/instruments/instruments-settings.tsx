"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { InstrumentPicker } from "@/components/instruments/instrument-picker";
import { Icon } from "@/components/ui/icon";
import type { ProfileInstrument } from "@/types";

interface Props {
  initial: ProfileInstrument[];
  limit: number | null;
}

export function InstrumentsSettings({ initial, limit }: Props) {
  const t = useTranslations("instruments.settings");
  const router = useRouter();

  return (
    <div className="max-w-2xl">
      <Link
        href="/profil/reglages"
        className="mb-3 inline-flex min-h-[36px] items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <Icon name="chevron_left" className="h-4 w-4" />
        {t("back")}
      </Link>
      <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("title")}
      </h2>
      <p className="py-3 text-sm text-muted-foreground">
        {t("hint")}
      </p>
      <InstrumentPicker
        initial={initial}
        limit={limit}
        submitLabel={t("save")}
        onSaved={() => router.push("/profil/reglages")}
      />
    </div>
  );
}
