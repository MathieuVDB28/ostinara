"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { BpmProgressData } from "@/types";

interface BpmProgressChartProps {
  data: BpmProgressData[];
}

const COLORS = [
  "#f97316", // orange
  "#3b82f6", // blue
  "#22c55e", // green
  "#a855f7", // purple
  "#ef4444", // red
  "#eab308", // yellow
];

export function BpmProgressChart({ data }: BpmProgressChartProps) {
  const [selectedSong, setSelectedSong] = useState<string | null>(
    data.length > 0 ? data[0].songId : null
  );

  const selectedData = data.find((d) => d.songId === selectedSong);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Progression du BPM</h3>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <svg className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-sm">Enregistre le BPM dans tes sessions</p>
          <p className="text-xs mt-1">pour voir ta progression</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Progression du BPM</h3>

      {/* Sélecteur de morceaux */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {data.map((song, index) => (
          <button
            key={song.songId}
            onClick={() => setSelectedSong(song.songId)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              whitespace-nowrap transition-all shrink-0
              ${selectedSong === song.songId
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
              }
            `}
          >
            {song.coverUrl ? (
              <img
                src={song.coverUrl}
                alt={song.songTitle}
                className="w-6 h-6 rounded object-cover"
              />
            ) : (
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: COLORS[index % COLORS.length] + "30" }}
              >
                <svg className="w-3 h-3" style={{ color: COLORS[index % COLORS.length] }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              </div>
            )}
            {song.songTitle}
          </button>
        ))}
      </div>

      {selectedData && (
        <>
          {/* Stats du morceau sélectionné */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{selectedData.latestBpm}</p>
              <p className="text-xs text-muted-foreground">BPM actuel</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{selectedData.bestBpm}</p>
              <p className="text-xs text-muted-foreground">Meilleur BPM</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className={`text-2xl font-bold ${
                selectedData.improvement >= 0 ? "text-emerald-500" : "text-red-500"
              }`}>
                {selectedData.improvement >= 0 ? "+" : ""}{selectedData.improvement}%
              </p>
              <p className="text-xs text-muted-foreground">Progression</p>
            </div>
          </div>

          {/* Graphique */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={selectedData.points}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  stroke="currentColor"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  stroke="currentColor"
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover text-popover-foreground rounded-lg shadow-lg border border-border px-3 py-2">
                          <p className="font-medium">{formatDate(data.date)}</p>
                          <p className="text-lg font-bold text-primary">{data.bpm} BPM</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bpm"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: "#f97316", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#f97316" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            {selectedData.points.length} sessions avec BPM enregistré
          </p>
        </>
      )}
    </div>
  );
}
