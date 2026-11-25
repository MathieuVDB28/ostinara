"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import { deleteCalendarToken, renewCalendarToken } from "@/lib/actions/agenda";
import { eventDay, type AgendaEvent } from "@/lib/agenda";
import { deviceTimeZone, wallDateKey } from "@/lib/time-zone";

interface AgendaViewProps {
  events: AgendaEvent[];
  isPaid: boolean;
  calendarToken: string | null;
  onPlan: (day: string) => void;
  onOpenPlanned: (id: string) => void;
}

const DOT: Record<AgendaEvent["kind"], string> = {
  planned: "bg-primary",
  rehearsal: "bg-foreground",
  concert: "bg-success",
};
const BUTTON =
  "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold transition-colors hover:bg-accent disabled:opacity-50";

const noSubscribe = () => () => {};

/** Un jour AAAA-MM-JJ est une date pure : tout se calcule en UTC. */
const toDate = (key: string) => new Date(`${key}T00:00:00Z`);
const toKey = (date: Date) => date.toISOString().slice(0, 10);
function addDays(key: string, days: number): string {
  const date = toDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toKey(date);
}
const mondayOf = (key: string) => addDays(key, -((toDate(key).getUTCDay() + 6) % 7));

function addMonth(key: string, months: number): string {
  const date = toDate(key);
  return toKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)));
}

export function AgendaView(props: AgendaViewProps) {
  // Le jour et le fuseau n'existent que dans le navigateur.
  const ready = useSyncExternalStore(noSubscribe, () => true, () => false);
  return ready ? <Agenda {...props} /> : <div className="min-h-[320px]" />;
}

function Agenda({ events, isPaid, calendarToken, onPlan, onOpenPlanned }: AgendaViewProps) {
  const t = useTranslations("play.agenda");
  const intlLocale = useIntlLocale();
  const zone = deviceTimeZone();
  const today = wallDateKey(new Date(), zone);
  const [mode, setMode] = useState<"week" | "month">("week");
  const [selected, setSelected] = useState(today);

  const byDay = new Map<string, AgendaEvent[]>();
  for (const event of events) {
    const key = eventDay(event, zone);
    byDay.set(key, [...(byDay.get(key) ?? []), event]);
  }

  const month = selected.slice(0, 7);
  const first = mondayOf(mode === "week" ? selected : `${month}-01`);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    const key = addDays(first, i);
    if (i >= 7 && (mode === "week" || (i % 7 === 0 && key.slice(0, 7) !== month))) break;
    days.push(key);
  }

  const format = (key: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, { ...options, timeZone: "UTC" }).format(toDate(key));
  const clock = (value: string) =>
    new Intl.DateTimeFormat(intlLocale, { hour: "2-digit", minute: "2-digit", timeZone: zone }).format(new Date(value));
  const move = (direction: 1 | -1) =>
    setSelected(mode === "week" ? addDays(selected, 7 * direction) : addMonth(selected, direction));

  const dayEvents = byDay.get(selected) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => move(-1)} aria-label={t("previous")} className="rounded-lg p-2 hover:bg-accent">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="min-w-[9rem] text-center font-display text-xl font-extrabold uppercase">
            {format(selected, { month: "long", year: "numeric" })}
          </h2>
          <button type="button" onClick={() => move(1)} aria-label={t("next")} className="rounded-lg p-2 hover:bg-accent">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setSelected(today)} className={BUTTON}>{t("today")}</button>
        </div>
        <div className="flex gap-1.5">
          {(["week", "month"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`${BUTTON} ${mode === value ? "bg-secondary" : "text-muted-foreground"}`}
            >
              {t(value)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.slice(0, 7).map((key) => (
          <span key={key} className="text-center font-mono text-[10.5px] font-semibold uppercase text-muted-foreground">
            {format(key, { weekday: "short" })}
          </span>
        ))}
        {days.map((key) => {
          const list = byDay.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={key === selected}
              aria-label={`${format(key, { weekday: "long", day: "numeric", month: "long" })}, ${t("count", { count: list.length })}`}
              onClick={() => setSelected(key)}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-lg border transition-colors ${
                key === selected ? "border-foreground bg-secondary" : "border-transparent hover:bg-accent"
              } ${mode === "month" && key.slice(0, 7) !== month ? "opacity-40" : ""}`}
            >
              <span className={`tabular text-sm ${key === today ? "font-extrabold underline underline-offset-4" : ""}`}>
                {toDate(key).getUTCDate()}
              </span>
              <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                {list.slice(0, 3).map((event) => (
                  <span key={event.key} className={`h-1.5 w-1.5 rounded-full ${DOT[event.kind]}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <section aria-labelledby="agenda-day">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
          <h3 id="agenda-day" className="text-sm font-semibold capitalize">
            {format(selected, { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          {selected >= today && (
            <button type="button" onClick={() => onPlan(selected)} className={BUTTON}>
              <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              {t("plan")}
            </button>
          )}
        </div>
        {dayEvents.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>}
        <ul>
          {dayEvents.map((event) => {
            const content = (
              <>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[event.kind]}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-semibold ${event.done ? "text-muted-foreground" : ""}`}>{event.title}</span>
                  <span className="tabular block text-xs text-muted-foreground">
                    {[
                      t(`kinds.${event.kind}`),
                      event.day ? t("allDay") : `${clock(event.starts_at)} – ${clock(event.ends_at)}`,
                      event.withName,
                      event.location,
                      event.done ? t("done") : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </>
            );
            const className = "flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-accent/50";
            return (
              <li key={event.key} className="border-b border-border">
                {event.kind === "planned" ? (
                  <button type="button" className={className} onClick={() => onOpenPlanned(event.key.slice("planned-".length))}>
                    {content}
                  </button>
                ) : (
                  <Link href={event.href} className={className}>{content}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <CalendarFeed isPaid={isPaid} initialToken={calendarToken} />
    </div>
  );
}

function CalendarFeed({ isPaid, initialToken }: { isPaid: boolean; initialToken: string | null }) {
  const t = useTranslations("play.agenda");
  const tc = useTranslations("common");
  const [token, setToken] = useState(initialToken);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isPaid) return <ProUpsell compact feature={t("feedUpsell")} description={t("feedHint")} />;

  const url = token ? `${window.location.origin}/api/agenda/${token}.ics` : "";
  const renew = () =>
    startTransition(async () => {
      const result = await renewCalendarToken();
      setMessage(result.success ? null : result.error ?? tc("genericError"));
      if (result.token) setToken(result.token);
    });
  const remove = () =>
    startTransition(async () => {
      const result = await deleteCalendarToken();
      setMessage(result.success ? null : result.error ?? tc("genericError"));
      if (result.success) setToken(null);
    });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(t("copied"));
    } catch {
      setMessage(t("copyFailed"));
    }
  };

  return (
    <section aria-labelledby="agenda-feed" className="space-y-2 border-t border-border pt-4">
      <h3 id="agenda-feed" className="text-sm font-semibold">{t("feedTitle")}</h3>
      <p className="text-xs text-muted-foreground">{t("feedHint")}</p>
      {token ? (
        <>
          <input
            readOnly
            value={url}
            aria-label={t("feedTitle")}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">{t("feedSecret")}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={BUTTON}>{t("copy")}</button>
            <a href={url.replace(/^https?:/, "webcal:")} className={BUTTON}>{t("openApple")}</a>
            <button type="button" disabled={pending} onClick={renew} className={BUTTON}>{t("renew")}</button>
            <button type="button" disabled={pending} onClick={remove} className={`${BUTTON} text-destructive`}>{t("disable")}</button>
          </div>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={renew} className={BUTTON}>{t("enable")}</button>
      )}
      {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
    </section>
  );
}
