"use client";

import { useState, useMemo } from "react";
import type { RehearsalWithDetails } from "@/types";

interface RehearsalCalendarProps {
  rehearsals: RehearsalWithDetails[];
  currentUserId: string;
  onRehearsalClick: (rehearsal: RehearsalWithDetails) => void;
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

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
        <button aria-label="Mois précédent"
          onClick={prevMonth}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold capitalize">
            {MONTHS_FR[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={goToToday}
            className="rounded-lg border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            Aujourd&apos;hui
          </button>
        </div>
        <button aria-label="Mois suivant"
          onClick={nextMonth}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_FR.map((day) => (
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
                    {new Date(r.date).toLocaleTimeString("fr-FR", {
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
