"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import type { RehearsalWithDetails } from "@/types";
import { Icon } from "@/components/ui/icon";

interface RehearsalCalendarProps {
  rehearsals: RehearsalWithDetails[];
  currentUserId: string;
  onRehearsalClick: (rehearsal: RehearsalWithDetails) => void;
}

/** Les jours (lundi en tete) et les mois, dans la langue de l'app. */
function calendarNames(intlLocale: string) {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/\.$/, "");
  // 1er janvier 2024 : un lundi.
  const days = Array.from({ length: 7 }, (_, d) =>
    capitalize(new Date(2024, 0, 1 + d).toLocaleDateString(intlLocale, { weekday: "short" }))
  );
  const months = Array.from({ length: 12 }, (_, m) =>
    capitalize(new Date(2024, m, 1).toLocaleDateString(intlLocale, { month: "long" }))
  );
  return { days, months };
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday = 0 in our display (ISO week starts Monday)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: (Date | null)[] = [];

  // Leading empty slots
  for (let i = 0; i < startDow; i++) {
    days.push(null);
  }

  // Actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}

export function RehearsalCalendar({
  rehearsals,
  currentUserId,
  onRehearsalClick,
}: RehearsalCalendarProps) {
  const t = useTranslations("rehearsals.calendar");
  const intlLocale = useIntlLocale();
  const { days: DAYS, months: MONTHS } = useMemo(() => calendarNames(intlLocale), [intlLocale]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const calendarDays = useMemo(
    () => getCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const rehearsalsByDate = useMemo(() => {
    const map = new Map<string, RehearsalWithDetails[]>();
    for (const r of rehearsals) {
      const key = new Date(r.date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [rehearsals]);

  const today = new Date().toDateString();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(new Date().getMonth());
    setCurrentYear(new Date().getFullYear());
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Navigation */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <button aria-label={t("previous")}
          onClick={prevMonth}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Icon name="chevron_left" className="h-[20px] w-[20px]" />
        </button>
        <div className="flex items-center gap-3">
          <h3 className="font-display text-xl font-extrabold uppercase">
            {MONTHS[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={goToToday}
            className="rounded-lg border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            {t("today")}
          </button>
        </div>
        <button aria-label={t("next")}
          onClick={nextMonth}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Icon name="chevron_right" className="h-[20px] w-[20px]" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="min-h-[72px] border-b border-r border-border bg-accent/20" />;
          }

          const dateStr = day.toDateString();
          const dayRehearsals = rehearsalsByDate.get(dateStr) || [];
          const isCurrentDay = dateStr === today;

          return (
            <div
              key={idx}
              className={`min-h-[72px] border-b border-r border-border p-1 ${
                isCurrentDay ? "bg-primary/5" : ""
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isCurrentDay
                    ? "bg-primary font-bold text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                {day.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayRehearsals.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onRehearsalClick(r)}
                    className={`w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium transition-colors hover:opacity-80 ${
                      r.status === "cancelled"
                        ? "bg-destructive/20 text-destructive line-through"
                        : r.status === "completed"
                        ? "bg-success/20 text-success"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {new Date(r.date).toLocaleTimeString(intlLocale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    {r.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
