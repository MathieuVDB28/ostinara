"use client";

import type { ChartData } from "@/types";
import { PracticeHeatmap } from "./practice-heatmap";
import { BpmProgressChart } from "./bpm-progress-chart";
import { MoodDistributionChart } from "./mood-distribution-chart";
import { SongDistributionChart } from "./song-distribution-chart";

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
