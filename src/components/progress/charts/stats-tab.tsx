"use client";

import dynamic from "next/dynamic";

import type { ChartData } from "@/types";
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

export function StatsTab({ data }: StatsTabProps) {
  return (
    <div className="space-y-6">
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
