"use client";

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

  return (
    <div className="space-y-4">
      {/* Toggle période */}
      <div className="flex gap-2">
        <button
          onClick={() => handlePeriodChange("week")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            period === "week"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Cette semaine
        </button>
        <button
          onClick={() => handlePeriodChange("month")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            period === "month"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-semibold">Pas encore de classement</h3>
          <p className="text-sm text-muted-foreground">
            Ajoute des amis et pratique pour apparaitre dans le classement !
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                entry.rank <= 3
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {/* Rang */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                {entry.rank === 1 ? (
                  <span className="text-2xl">🥇</span>
                ) : entry.rank === 2 ? (
                  <span className="text-2xl">🥈</span>
                ) : entry.rank === 3 ? (
                  <span className="text-2xl">🥉</span>
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">
                    {entry.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              {entry.avatar_url ? (
                <img
                  src={entry.avatar_url}
                  alt={entry.display_name || entry.username}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {(entry.display_name || entry.username)[0]?.toUpperCase()}
                </div>
              )}

              {/* Nom */}
              <div className="flex-1">
                <p className="font-medium">
                  {entry.display_name || entry.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.sessions_count} session{entry.sessions_count > 1 ? "s" : ""}
                </p>
              </div>

              {/* Temps */}
              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  {formatMinutes(entry.total_minutes)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
