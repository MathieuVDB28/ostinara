"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import { useIntlLocale } from "@/i18n/intl-locale";
import { setTempoGoal } from "@/lib/actions/pro";
import { formatConcertDate, parisToday } from "@/lib/concerts";
import { projectTempoGoal } from "@/lib/tempo-goals";
import type { Instrument, SongBpmPoint, UserPlan } from "@/types";

interface TempoGoalBlockProps {
  songId: string;
  instrument: Instrument;
  goal: { bpm: number; date: string } | null;
  points: SongBpmPoint[] | null;
  suggestedBpm: number | null;
  userPlan: UserPlan;
  onSaved: () => void;
}

const FIELD = "tabular min-h-[40px] rounded-lg border border-input bg-background px-3 text-sm focus:border-primary";

/** « Tel tempo a telle date » pour l'instrument affiche : ou j'en suis, et a quelle allure. */
export function TempoGoalBlock({ songId, instrument, goal, points, suggestedBpm, userPlan, onSaved }: TempoGoalBlockProps) {
  const t = useTranslations("library.goal");
  const locale = useIntlLocale();
  const [current, setCurrent] = useState(goal);
  const [editing, setEditing] = useState(false);
  const [bpm, setBpm] = useState(String(goal?.bpm ?? suggestedBpm ?? ""));
  const [date, setDate] = useState(goal?.date ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPro = userPlan !== "free";
  const today = parisToday();

  const save = async (next: { bpm: number; date: string } | null) => {
    setBusy(true);
    setError(null);
    const result = await setTempoGoal(songId, instrument, next);
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? null);
      return;
    }
    setCurrent(next);
    setEditing(false);
    onSaved();
  };

  if (!isPro && !current) {
    return <ProUpsell compact feature={t("upsell")} description="" />;
  }

  const projection = current ? projectTempoGoal(points ?? [], current.bpm, current.date, today) : null;

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Icon name="event" className="h-4 w-4" />
          {t("title")}
        </h3>
        {current && !editing && isPro && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold hover:underline">
            {t("edit")}
          </button>
        )}
      </div>

      {current && projection && !editing && (
        <div className="space-y-1">
          <p className="text-sm">
            {t.rich("summary", {
              bpm: current.bpm,
              date: formatConcertDate(current.date, locale),
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {projection.best !== null ? t("best", { bpm: projection.best }) : t("noSession")}
          </p>
          <p className={`text-sm font-semibold ${projection.status === "behind" || projection.status === "overdue" ? "text-destructive" : ""}`}>
            {projection.status === "reached" && t("reached")}
            {projection.status === "overdue" && t("overdue")}
            {projection.status === "onTrack" && t("onTrack", { per: projection.recentPerWeek ?? 0 })}
            {projection.status === "behind" &&
              (projection.daysLeft < 7
                ? t("behindSoon", { left: current.bpm - (projection.best ?? 0), days: projection.daysLeft })
                : t("behind", { needed: projection.neededPerWeek ?? 0, per: projection.recentPerWeek ?? 0 }))}
            {projection.status === "unknown" &&
              (projection.neededPerWeek !== null && projection.daysLeft >= 7
                ? t("needed", { needed: projection.neededPerWeek })
                : t("unknown"))}
          </p>
          {!isPro && <ProUpsell compact feature={t("lapsed")} description="" />}
        </div>
      )}

      {(!current || editing) && isPro && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={`goal-bpm-${instrument}`} className="mb-1 block text-xs font-semibold text-muted-foreground">{t("bpm")}</label>
            <input id={`goal-bpm-${instrument}`} type="number" inputMode="numeric" min={20} max={300} value={bpm} onChange={(event) => setBpm(event.target.value)} className={`${FIELD} w-24`} />
          </div>
          <div>
            <label htmlFor={`goal-date-${instrument}`} className="mb-1 block text-xs font-semibold text-muted-foreground">{t("date")}</label>
            <input id={`goal-date-${instrument}`} type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} className={FIELD} />
          </div>
          <button
            type="button"
            disabled={busy || !bpm || !date}
            onClick={() => void save({ bpm: parseInt(bpm, 10), date })}
            className="min-h-[40px] rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40"
          >
            {t("save")}
          </button>
          {editing && (
            <button type="button" onClick={() => setEditing(false)} className="min-h-[40px] rounded-full px-3 text-sm font-semibold hover:bg-accent">
              {t("cancel")}
            </button>
          )}
        </div>
      )}

      {current && (editing || !isPro) && (
        <button type="button" disabled={busy} onClick={() => void save(null)} className="text-xs font-semibold text-muted-foreground hover:text-destructive">
          {t("remove")}
        </button>
      )}

      {!current && !editing && <p className="text-xs text-muted-foreground">{t("hint")}</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
