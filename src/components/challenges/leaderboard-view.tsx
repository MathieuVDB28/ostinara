"use client";

import Image from "next/image";
import { useState } from "react";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/types";
import { getLeaderboard } from "@/lib/actions/challenges";

interface LeaderboardViewProps {
  initialLeaderboard: LeaderboardEntry[];
}

export function LeaderboardView({ initialLeaderboard }: LeaderboardViewProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [isLoading, setIsLoading] = useState(false);

  const handlePeriodChange = async (newPeriod: LeaderboardPeriod) => {
    setPeriod(newPeriod);
    setIsLoading(true);

    const data = await getLeaderboard(newPeriod);
    setLeaderboard(data);
    setIsLoading(false);
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return (
      <span className="text-lg font-bold text-muted-foreground">{rank}</span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Time filter buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handlePeriodChange("week")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            period === "week"
              ? "bg-primary text-white"
              : "bg-card border border-border text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Cette semaine
        </button>
        <button
          onClick={() => handlePeriodChange("month")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            period === "month"
              ? "bg-primary text-white"
              : "bg-card border border-border text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Ce mois
        </button>
      </div>

      {/* Leaderboard */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <span className="material-symbols-outlined text-3xl text-muted-foreground">
              emoji_events
            </span>
          </div>
          <h3 className="mb-2 font-semibold">Pas encore de classement</h3>
          <p className="text-sm text-muted-foreground">
            Ajoute des amis et pratique pour apparaitre dans le classement !
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div
              key={entry.user_id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              {/* Rank medal/number */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                {getRankDisplay(entry.rank)}
              </div>

              {/* Avatar */}
              {entry.avatar_url ? (
                <Image
                  src={entry.avatar_url}
                  alt={entry.display_name || entry.username}
                  className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                  width={48}
                  height={48}
                />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                  {(entry.display_name || entry.username)[0]?.toUpperCase()}
                </div>
              )}

              {/* Username */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {entry.display_name || entry.username}
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">
                      play_circle
                    </span>
                    {entry.sessions_count} session
                    {entry.sessions_count > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">
                      schedule
                    </span>
                    {formatMinutes(entry.total_minutes)}
                  </span>
                </div>
              </div>

              {/* Trophy icon for top 3 */}
              {entry.rank <= 3 && (
                <span className="material-symbols-outlined text-primary">
                  emoji_events
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
