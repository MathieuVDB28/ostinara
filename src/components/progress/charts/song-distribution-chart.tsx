"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SongPracticeDistribution } from "@/types";

interface SongDistributionChartProps {
  data: SongPracticeDistribution[];
}

const COLORS = [
  "#f97316", // orange (primary)
  "#fb923c",
  "#fdba74",
  "#fed7aa",
  "#ffedd5",
  "#fff7ed",
  "#fef3c7",
  "#fde68a",
  "#fcd34d",
  "#fbbf24",
];

export function SongDistributionChart({ data }: SongDistributionChartProps) {
  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
  };

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Top morceaux</h3>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <svg className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
          <p className="text-sm">Associe des morceaux à tes sessions</p>
          <p className="text-xs mt-1">pour voir ton top</p>
        </div>
      </div>
    );
  }

  const totalMinutes = data.reduce((sum, d) => sum + d.totalMinutes, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Top morceaux</h3>
        <span className="text-sm text-muted-foreground">
          {formatMinutes(totalMinutes)} au total
        </span>
      </div>

      {/* Version graphique pour desktop */}
      <div className="hidden sm:block h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={formatMinutes}
              className="text-muted-foreground"
              stroke="currentColor"
            />
            <YAxis
              type="category"
              dataKey="songTitle"
              tick={{ fontSize: 12 }}
              width={120}
              className="text-muted-foreground"
              stroke="currentColor"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const song = payload[0].payload as SongPracticeDistribution;
                  return (
                    <div className="bg-popover text-popover-foreground rounded-lg shadow-lg border border-border px-3 py-2">
                      <p className="font-medium">{song.songTitle}</p>
                      <p className="text-sm text-muted-foreground">{song.songArtist}</p>
                      <div className="mt-1 text-sm">
                        <span className="font-medium text-primary">{formatMinutes(song.totalMinutes)}</span>
                        <span className="text-muted-foreground"> · {song.totalSessions} sessions</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="totalMinutes" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Version liste pour mobile */}
      <div className="sm:hidden space-y-3">
        {data.map((song, index) => (
          <div key={song.songId} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 text-center">
              <span className="text-lg font-bold text-muted-foreground">
                {index + 1}
              </span>
            </div>
            {song.coverUrl ? (
              <img
                src={song.coverUrl}
                alt={song.songTitle}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] + "30" }}
              >
                <svg className="w-5 h-5" style={{ color: COLORS[index % COLORS.length] }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{song.songTitle}</p>
              <p className="text-sm text-muted-foreground truncate">
                {song.songArtist}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-medium" style={{ color: COLORS[index % COLORS.length] }}>
                {formatMinutes(song.totalMinutes)}
              </p>
              <p className="text-xs text-muted-foreground">
                {song.percentage}%
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Barre de progression totale */}
      <div className="mt-6">
        <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
          {data.map((song, index) => (
            <div
              key={song.songId}
              className="h-full transition-all"
              style={{
                width: `${song.percentage}%`,
                backgroundColor: COLORS[index % COLORS.length],
              }}
              title={`${song.songTitle}: ${song.percentage}%`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
