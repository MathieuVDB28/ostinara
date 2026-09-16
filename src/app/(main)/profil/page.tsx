import { getPracticeSessions, getPracticeStats, getChartData } from "@/lib/actions/practice";
import { getSongs } from "@/lib/actions/songs";
import { getUserAlbumReviews } from "@/lib/actions/albums";
import { ProgressView } from "@/components/progress/progress-view";
import { SESSIONS_PER_PAGE } from "@/lib/pagination";

export default async function ProfilProgressionPage() {
  // Une page de journal, pas tout l'historique : la suite se charge a la
  // demande, et `stats.totalSessions` dit combien il en reste.
  const [sessions, stats, songs, chartData, recentAlbums] = await Promise.all([
    getPracticeSessions(undefined, SESSIONS_PER_PAGE),
    getPracticeStats(),
    getSongs(),
    getChartData(365),
    getUserAlbumReviews(5),
  ]);

  return (
    <ProgressView
      initialSessions={sessions}
      initialStats={stats}
      songs={songs}
      chartData={chartData}
      recentAlbums={recentAlbums}
    />
  );
}
