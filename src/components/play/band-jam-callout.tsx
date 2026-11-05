"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getBandAccessStatus } from "@/lib/actions/bands";
import { createJamSession, getActiveJamSession } from "@/lib/actions/jam-sessions";
import type { BandStatus } from "@/lib/band-access";

interface BandJamCalloutProps {
  bandId: string;
  bandName: string;
  setlistId: string;
}

const BUTTON =
  "inline-flex min-h-[40px] shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

/**
 * Une setlist de groupe se joue aussi a plusieurs : le chrono du dessous
 * reste solo, la jam ajoute le metronome synchronise et le chat.
 */
export function BandJamCallout({ bandId, bandName, setlistId }: BandJamCalloutProps) {
  const t = useTranslations("play.setlistPanel");
  const router = useRouter();
  const [status, setStatus] = useState<BandStatus | null>(null);
  const [activeJamId, setActiveJamId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getBandAccessStatus(bandId), getActiveJamSession(bandId)])
      .then(([bandAccess, jam]) => {
        if (!active) return;
        setStatus(bandAccess);
        setActiveJamId(jam?.id ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [bandId]);

  if (!status) return null;

  if (status === "read_only") {
    return <p className="border-y border-border py-3 text-sm text-muted-foreground">{t("jamReadOnly", { band: bandName })}</p>;
  }

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
