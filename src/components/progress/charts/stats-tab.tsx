"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { getChartData } from "@/lib/actions/practice";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { InstrumentSwitch } from "@/components/instruments/instrument-switch";
import { instrumentLabel, instrumentMeta } from "@/lib/instruments";
import { Icon } from "@/components/ui/icon";
import type { ChartData, Instrument } from "@/types";
import { PracticeHeatmap } from "./practice-heatmap";
// recharts (~380 Ko avec ses dependances) n'est tire que lorsque
// l'onglet Stats est reellement affiche.
const chartFallback = () => (
  <div className="h-64 w-full animate-pulse rounded-2xl bg-muted" />
);

const BpmProgressChart = dynamic(
  () => import("./bpm-progress-chart").then((m) => m.BpmProgressChart),
  { ssr: false, loading: chartFallback }
);
const MoodDistributionChart = dynamic(
  () => import("./mood-distribution-chart").then((m) => m.MoodDistributionChart),
  { ssr: false, loading: chartFallback }
);
const SongDistributionChart = dynamic(
  () => import("./song-distribution-chart").then((m) => m.SongDistributionChart),
  { ssr: false, loading: chartFallback }
);

interface StatsTabProps {
  data: ChartData;
}

export function StatsTab({ data: initialData }: StatsTabProps) {
  // Plusieurs instruments : les stats d'un seul, ou de tous.
  const t = useTranslations("progress.statsTab");
  const te = useTranslations("enums");
  const myInstruments = useMyInstruments();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const choose = (next: Instrument | null) => {
    setInstrument(next);
    startTransition(async () => {
      setData(next ? await getChartData(365, next) : initialData);
    });
  };

  const distribution = initialData.instrumentDistribution ?? [];
  const totalMinutes = distribution.reduce((sum, row) => sum + row.minutes, 0);

  return (
    <div className={`space-y-6 transition-opacity ${isPending ? "opacity-60" : ""}`}>
      {myInstruments.isMulti && (
        <InstrumentSwitch
          options={myInstruments.instruments}
          value={instrument}
          onChange={choose}
          allLabel={t("all")}
          onAll={() => choose(null)}
          label={t("statsFor")}
        />
      )}

      {/* Le temps par instrument, quand on en a travaille plusieurs */}
      {distribution.length > 1 && totalMinutes > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t("timePerInstrument")}</h3>
          <ul className="space-y-3">
            {distribution.map((row) => {
              const entry = myInstruments.instruments.find((i) => i.instrument === row.instrument);
              const label = instrumentLabel(entry ?? { instrument: row.instrument }, te);
              const percent = Math.round((row.minutes / totalMinutes) * 100);
              return (
                <li key={row.instrument}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Icon name={instrumentMeta(row.instrument).icon} className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </span>
                    <span className="tabular text-muted-foreground">
                      {Math.floor(row.minutes / 60)} h {String(row.minutes % 60).padStart(2, "0")} · {percent} %
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Heatmap - prend toute la largeur */}
      <PracticeHeatmap data={data.heatmap} />

      {/* Grille pour les autres graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Progression BPM */}
        <BpmProgressChart data={data.bpmProgress} />

        {/* Distribution des humeurs */}
        <MoodDistributionChart data={data.moodDistribution} />
      </div>

      {/* Top morceaux - prend toute la largeur */}
      <SongDistributionChart data={data.songDistribution} />
    </div>
  );
}
