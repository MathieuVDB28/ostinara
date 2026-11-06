"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { formatDuration } from "@/components/progress/stats-summary";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import {
  confirmRehearsalAttendance,
  declineRehearsalAttendance,
  joinRehearsalAttendance,
} from "@/lib/actions/rehearsal-logs";
import { REHEARSAL_MAX_MINUTES } from "@/lib/rehearsal-log";
import {
  initialRehearsalInstrument,
  REHEARSAL_FIELD_LABEL,
  RehearsalCarnetFields,
} from "./rehearsal-carnet-fields";
import type { Instrument, RehearsalAttendee, SessionMood } from "@/types";

interface RehearsalAttendanceCardProps {
  rehearsalId: string;
  /** Ma ligne de presence ; absente si personne ne m'a tague. */
  attendance: RehearsalAttendee | null;
  poste: { instrument?: Instrument | null; instrument_label?: string | null } | null;
  durationMinutes: number;
  shareDefault: boolean;
  /** Groupe en lecture seule : on repond a un tag, on ne s'en ajoute pas. */
  readOnly: boolean;
}

/**
 * « Tu y etais ? ». Rien n'entre dans mes statistiques sans mon accord : je
 * confirme ici, en corrigeant au besoin ce que j'y ai joue et combien de temps.
 */
export function RehearsalAttendanceCard({
  rehearsalId,
  attendance,
  poste,
  durationMinutes,
  shareDefault,
  readOnly,
}: RehearsalAttendanceCardProps) {
  const t = useTranslations("rehearsals.attendance");
  const tc = useTranslations("common");
  const router = useRouter();
  const { primary } = useMyInstruments();

  const [open, setOpen] = useState(attendance?.status === "pending");
  const [minutes, setMinutes] = useState(durationMinutes);
  const [instrument, setInstrument] = useState<Instrument>(() =>
    initialRehearsalInstrument(attendance ?? poste, primary)
  );
  const [mood, setMood] = useState<SessionMood | null>(null);
  const [share, setShare] = useState(shareDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? t("failed"));
      return false;
    }
    router.refresh();
    return true;
  };

  const handleConfirm = async () => {
    // Pas encore tague : « J'y etais aussi » cree d'abord ma ligne.
    if (!attendance) {
      const joined = await run(() => joinRehearsalAttendance(rehearsalId));
      if (!joined) return;
    }
    const confirmed = await run(() =>
      confirmRehearsalAttendance(rehearsalId, { instrument, duration_minutes: minutes, mood, share })
    );
    if (confirmed) setOpen(false);
  };

  if (attendance?.status === "confirmed") {
    return (
      <p className="flex items-center gap-2 border-y border-border py-3 text-sm font-semibold text-success">
        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        {t("confirmed")}
      </p>
    );
  }

  if (!open) {
    if (!attendance && readOnly) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border py-3">
        <p className="text-sm text-muted-foreground">
          {attendance?.status === "declined" ? t("declinedNote") : t("notTagged")}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[38px] items-center rounded-xl border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-accent"
        >
          {t("wasThere")}
        </button>
      </div>
    );
  }

  return (
    <section aria-labelledby="rehearsal-attendance" className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 id="rehearsal-attendance" className="font-display text-2xl font-extrabold uppercase leading-none">
          {t("question")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("explain", { duration: formatDuration(minutes || 0, tc) })}
        </p>
      </div>

      <div>
        <label htmlFor="attendance-minutes" className={REHEARSAL_FIELD_LABEL}>
          {t("myDuration")}
        </label>
        <input
          id="attendance-minutes"
          type="number"
          inputMode="numeric"
          min={1}
          max={REHEARSAL_MAX_MINUTES}
          value={minutes || ""}
          onChange={(event) => setMinutes(Number(event.target.value))}
          className="tabular min-h-[44px] w-28 rounded-xl border border-input bg-background px-3 text-sm focus:border-primary"
        />
      </div>

      <RehearsalCarnetFields
        poste={attendance ?? poste}
        instrument={instrument}
        onInstrumentChange={setInstrument}
        mood={mood}
        onMoodChange={setMood}
        share={share}
        onShareChange={setShare}
      />

      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy || !(minutes >= 1 && minutes <= REHEARSAL_MAX_MINUTES)}
          className="min-h-[44px] rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {t("confirm")}
        </button>
        {attendance?.status === "pending" ? (
          <button
            type="button"
            onClick={() => run(() => declineRehearsalAttendance(rehearsalId)).then((done) => done && setOpen(false))}
            disabled={busy}
            className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
          >
            {t("decline")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent"
          >
            {tc("cancel")}
          </button>
        )}
      </div>
    </section>
  );
}
