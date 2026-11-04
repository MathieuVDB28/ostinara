"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import { createJamSession, getActiveJamSession } from "@/lib/actions/jam-sessions";
import type { UserPlan } from "@/types";

interface BandJamCalloutProps {
  bandId: string;
  bandName: string;
  setlistId: string;
  userPlan: UserPlan;
}

const BUTTON =
  "inline-flex min-h-[40px] shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

/**
 * Une setlist de groupe se joue aussi a plusieurs : le chrono du dessous
 * reste solo, la jam ajoute le metronome synchronise et le chat.
 */
export function BandJamCallout({ bandId, bandName, setlistId, userPlan }: BandJamCalloutProps) {
  const t = useTranslations("play.setlistPanel");
  const router = useRouter();
  const canJam = userPlan === "band";
  const [activeJamId, setActiveJamId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canJam) return;
    let active = true;
    getActiveJamSession(bandId)
      .then((jam) => {
        if (active) setActiveJamId(jam?.id ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [bandId, canJam]);

  if (!canJam) return <ProUpsell compact feature={t("jamUpsell")} description="" />;

  const launch = async () => {
    setLaunching(true);
    setError(null);
    const result = await createJamSession(bandId, setlistId);
    if (result.success && result.session) {
      router.push(`/jam/${result.session.id}`);
      return;
    }
    setError(result.error ?? t("jamFailed"));
    setLaunching(false);
  };

  return (
    <div className="border-y border-border py-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 basis-48 text-sm text-muted-foreground">
          {activeJamId ? t("jamRunning", { band: bandName }) : t("jamHint", { band: bandName })}
        </p>
        {activeJamId ? (
          <Link href={`/jam/${activeJamId}`} className={BUTTON}>
            {t("jamJoin")}
          </Link>
        ) : (
          <button type="button" onClick={launch} disabled={launching} className={BUTTON}>
            {t("jamLaunch")}
          </button>
        )}
      </div>
      {error && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
