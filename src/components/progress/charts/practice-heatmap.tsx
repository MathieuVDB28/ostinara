"use client";

import { useMemo, useState } from "react";
import type { HeatmapData, HeatmapDay } from "@/types";

interface PracticeHeatmapProps {
  data: HeatmapData;
}

const LEVEL_COLORS = [
  "bg-muted/30",           // 0 - pas de pratique
  "bg-emerald-200 dark:bg-emerald-900",  // 1 - faible
  "bg-emerald-400 dark:bg-emerald-700",  // 2 - moyen
  "bg-emerald-500 dark:bg-emerald-500",  // 3 - élevé
  "bg-emerald-600 dark:bg-emerald-400",  // 4 - max
];

const MONTHS_FR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"
];

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function PracticeHeatmap({ data }: PracticeHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Organiser les jours en semaines (colonnes)
  const { weeks, months } = useMemo(() => {
    const weeks: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];

    // Trouver le premier jour et commencer au début de la semaine
    if (data.days.length > 0) {
      const firstDay = new Date(data.days[0].date);
      const firstDayOfWeek = firstDay.getDay();

      // Ajouter des jours vides au début si nécessaire
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({
          date: "",
          minutes: 0,
          sessions: 0,
          level: 0,
        });
      }
    }

    data.days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Ajouter la dernière semaine partielle
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // Calculer les mois à afficher
    const months: { label: string; colStart: number; colSpan: number }[] = [];
    let currentMonth = -1;
    let currentMonthStart = 0;

    weeks.forEach((week, weekIndex) => {
      const validDay = week.find((d) => d.date);
      if (validDay) {
        const month = new Date(validDay.date).getMonth();
        if (month !== currentMonth) {
          if (currentMonth !== -1) {
            months.push({
              label: MONTHS_FR[currentMonth],
              colStart: currentMonthStart,
              colSpan: weekIndex - currentMonthStart,
            });
          }
          currentMonth = month;
          currentMonthStart = weekIndex;
        }
      }
    });

    // Ajouter le dernier mois
    if (currentMonth !== -1) {
      months.push({
        label: MONTHS_FR[currentMonth],
        colStart: currentMonthStart,
        colSpan: weeks.length - currentMonthStart,
      });
    }

    return { weeks, months };
  }, [data.days]);

  const handleMouseEnter = (
    day: HeatmapDay,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!day.date) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    setHoveredDay(day);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  if (data.days.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Calendrier de pratique</h3>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <svg className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="text-sm">Pas encore de sessions enregistrées</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Calendrier de pratique</h3>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{data.activeDays}</span> jours actifs
        </div>
      </div>

      {/* Légende des mois */}
      <div className="mb-2 ml-8 flex text-xs text-muted-foreground">
        {months.map((month, i) => (
          <div
            key={i}
            style={{
              width: `${month.colSpan * 14}px`,
              marginLeft: i === 0 ? `${month.colStart * 14}px` : 0,
            }}
          >
            {month.label}
          </div>
        ))}
      </div>

      {/* Grille principale */}
      <div className="flex">
        {/* Légende des jours */}
        <div className="flex flex-col justify-around text-xs text-muted-foreground mr-2 h-[98px]">
          <span className="h-[14px] flex items-center">{DAYS_FR[1]}</span>
          <span className="h-[14px] flex items-center">{DAYS_FR[3]}</span>
          <span className="h-[14px] flex items-center">{DAYS_FR[5]}</span>
        </div>

        {/* Grille des jours */}
        <div className="flex gap-[2px] overflow-x-auto pb-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[2px]">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`
                    w-[12px] h-[12px] rounded-sm
                    ${day.date ? LEVEL_COLORS[day.level] : "bg-transparent"}
                    ${day.date ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : ""}
                    transition-all
                  `}
                  onMouseEnter={(e) => handleMouseEnter(day, e)}
                  onMouseLeave={() => setHoveredDay(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Légende des niveaux */}
      <div className="mt-4 flex items-center justify-end gap-1 text-xs text-muted-foreground">
        <span>Moins</span>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={i}
            className={`w-[12px] h-[12px] rounded-sm ${color}`}
          />
        ))}
        <span>Plus</span>
      </div>

      {/* Tooltip */}
      {hoveredDay && hoveredDay.date && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-popover text-popover-foreground rounded-lg shadow-lg border border-border px-3 py-2 text-sm">
            <p className="font-medium capitalize">{formatDate(hoveredDay.date)}</p>
            {hoveredDay.minutes > 0 ? (
              <p className="text-muted-foreground">
                {formatMinutes(hoveredDay.minutes)} · {hoveredDay.sessions} session{hoveredDay.sessions > 1 ? "s" : ""}
              </p>
            ) : (
              <p className="text-muted-foreground">Pas de pratique</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
