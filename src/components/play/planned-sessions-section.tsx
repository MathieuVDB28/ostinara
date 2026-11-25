"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Play, Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { answerPlannedSession, setPlannedReminder, skipPlannedSession } from "@/lib/actions/planned-sessions";
import { deviceTimeZone, safeTimeZone } from "@/lib/time-zone";
import type { PlannedRemind, PlannedSession } from "@/types";

interface PlannedSessionsSectionProps {
  sessions: PlannedSession[];
  /** La session d'ou vient la notification. */
  highlightId?: string;
  onPlan: () => void;
  onEdit: (session: PlannedSession) => void;
  /** Charge la session ; renvoie le nombre de morceaux absents de ma biblio. */
  onLaunch: (session: PlannedSession) => number;
}

const SHOWN = 4;
const ACTION =
  "inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold transition-colors hover:bg-accent disabled:opacity-50";

export const REMIND_OPTIONS: { value: PlannedRemind; key: "none" | "now" | "m15" | "h1" | "d1" }[] = [
  { value: null, key: "none" },
  { value: 0, key: "now" },
  { value: 15, key: "m15" },
  { value: 60, key: "h1" },
  { value: 1440, key: "d1" },
];

// L'heure n'est lue que dans le navigateur, a la minute : rien a hydrater.
function subscribeMinute(onChange: () => void) {
  const timer = setInterval(onChange, 15_000);
  return () => clearInterval(timer);
}
const readMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

/** Les sessions planifiees, en tete du Carnet : repondre, jouer, reporter, passer. */
export function PlannedSessionsSection({ sessions, highlightId, onPlan, onEdit, onLaunch }: PlannedSessionsSectionProps) {
  const t = useTranslations("play.planned");
  const intlLocale = useIntlLocale();
  const router = useRouter();
  const now = useSyncExternalStore(subscribeMinute, readMinute, () => 0);
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ success: boolean; error?: string }>) =>
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (!result.success) setMessage(result.error ?? null);
      router.refresh();
    });

  const end = (s: PlannedSession) => new Date(s.starts_at).getTime() + s.duration_minutes * 60_000;
  const invitations = sessions.filter((s) => s.me.role === "guest" && s.me.rsvp === "invited" && new Date(s.starts_at).getTime() > now);
  const mine = sessions.filter((s) => s.me.rsvp === "accepted" && s.me.state === "planned");
  const missed = now ? mine.filter((s) => end(s) < now) : [];
  // Passee par erreur : elle se reprend tant que son heure n'est pas passee.
  const skipped = now ? sessions.filter((s) => s.me.rsvp === "accepted" && s.me.state === "skipped" && end(s) >= now) : [];
  const upcoming = mine.filter((s) => end(s) >= now);

  // Une serie ou je suis invite se repond d'un coup : sa premiere seance suffit.
  const seenSeries = new Set<string>();
  const firstInvitations = invitations.filter((s) => {
    if (!s.series_id) return true;
    if (seenSeries.has(s.series_id)) return false;
    seenSeries.add(s.series_id);
    return true;
  });

  const when = (s: PlannedSession) =>
    new Intl.DateTimeFormat(intlLocale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      // Le meme rendu cote serveur et au premier rendu du navigateur.
      timeZone: now ? deviceTimeZone() : safeTimeZone(s.time_zone),
    }).format(new Date(s.starts_at));

  const otherName = (s: PlannedSession) => s.other?.profile.display_name || s.other?.profile.username || "";

  const details = (s: PlannedSession) =>
    [
      when(s),
      t("minutes", { count: s.duration_minutes }),
      s.location,
      s.items.length > 0 ? t("itemCount", { count: s.items.length }) : null,
      s.other && s.me.rsvp === "accepted"
        ? s.me.role === "guest"
          ? t("with", { name: otherName(s) })
          : t(`guest.${s.other.rsvp}`, { name: otherName(s) })
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const row = (s: PlannedSession, actions: React.ReactNode) => (
    <li
      key={s.id}
      className={`border-b border-border py-3 ${s.id === highlightId ? "bg-accent/50 px-2" : ""}`}
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <span className="min-w-0 truncate">{s.title}</span>
        {s.series_id && <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={t("recurring")} />}
      </p>
      <p className="tabular mt-0.5 text-xs text-muted-foreground">{details(s)}</p>
      {s.note && <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">{actions}</div>
    </li>
  );

  const playButton = (s: PlannedSession) => (
    <button
      type="button"
      className={ACTION}
      onClick={() => {
        const missing = onLaunch(s);
        if (missing > 0) setMessage(t("missingSongs", { count: missing }));
      }}
    >
      <Play className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden="true" />
      {t("play")}
    </button>
  );

  return (
    <section aria-labelledby="planned-sessions" className="mb-6">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h2
          id="planned-sessions"
          className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {t("title")}
        </h2>
        <button type="button" onClick={onPlan} className={ACTION}>
          <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          {t("plan")}
        </button>
      </div>

      {message && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {message}
        </p>
      )}

      <ul>
        {firstInvitations.map((s) =>
          row(
            s,
            <>
              <span className="w-full text-xs font-semibold">{t("invitation", { name: otherName(s) })}</span>
              <button type="button" disabled={pending} className={ACTION} onClick={() => run(() => answerPlannedSession(s.id, true, deviceTimeZone()))}>
                <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                {t("accept")}
              </button>
              <button type="button" disabled={pending} className={ACTION} onClick={() => run(() => answerPlannedSession(s.id, false, deviceTimeZone()))}>
                {t("decline")}
              </button>
            </>
          )
        )}

        {missed.map((s) =>
          row(
            s,
            <>
              <span className="text-xs font-semibold text-muted-foreground">{t("missed")}</span>
              {playButton(s)}
              {s.me.role === "owner" && (
                <button type="button" className={ACTION} onClick={() => onEdit(s)}>
                  {t("postpone")}
                </button>
              )}
              <button type="button" disabled={pending} className={ACTION} onClick={() => run(() => skipPlannedSession(s.id, true))}>
                {t("skip")}
              </button>
            </>
          )
        )}

        {(showAll ? upcoming : upcoming.slice(0, SHOWN)).map((s) =>
          row(
            s,
            <>
              {playButton(s)}
              {s.me.role === "owner" ? (
                <button type="button" className={ACTION} onClick={() => onEdit(s)}>
                  {t("edit")}
                </button>
              ) : (
                <>
                  <button type="button" disabled={pending} className={ACTION} onClick={() => run(() => answerPlannedSession(s.id, false, deviceTimeZone()))}>
                    {t("decline")}
                  </button>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {t("reminder")}
                    <select
                      value={s.me.remind_minutes ?? ""}
                      disabled={pending}
                      onChange={(e) => {
                        const value = e.target.value === "" ? null : (Number(e.target.value) as PlannedRemind);
                        run(() => setPlannedReminder(s.id, value));
                      }}
                      className="rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground"
                    >
                      {REMIND_OPTIONS.map((option) => (
                        <option key={option.key} value={option.value ?? ""}>{t(`remind.${option.key}`)}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {s.me.role === "owner" && (
                <button type="button" disabled={pending} className={ACTION} onClick={() => run(() => skipPlannedSession(s.id, true))}>
                  {t("skip")}
                </button>
              )}
            </>
          )
        )}
        {showAll || upcoming.length <= SHOWN
          ? skipped.map((s) =>
              row(
                s,
                <>
                  <span className="text-xs font-semibold text-muted-foreground">{t("skipped")}</span>
                  <button type="button" disabled={pending} className={ACTION} onClick={() => run(() => skipPlannedSession(s.id, false))}>
                    {t("restore")}
                  </button>
                  {s.me.role === "owner" && (
                    <button type="button" className={ACTION} onClick={() => onEdit(s)}>
                      {t("edit")}
                    </button>
                  )}
                </>
              )
            )
          : null}
      </ul>

      {upcoming.length > SHOWN && (
        <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 text-xs font-semibold hover:underline">
          {showAll ? t("showLess") : t("showAll", { count: upcoming.length })}
        </button>
      )}
      {firstInvitations.length + missed.length + upcoming.length + skipped.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </section>
  );
}
