import { getPracticeSessions, getPracticeStats, getChartData } from "@/lib/actions/practice";
import { getSongs } from "@/lib/actions/songs";
import { ProgressView } from "@/components/progress/progress-view";

export default async function ProgressPage() {
  const [sessions, stats, songs, chartData] = await Promise.all([
    getPracticeSessions(undefined, 50),
    getPracticeStats(),
    getSongs(),
    getChartData(365), // Dernière année
  ]);

  return (
    <ProgressView
      initialSessions={sessions}
      initialStats={stats}
      songs={songs}
      chartData={chartData}
    />
  );
}
