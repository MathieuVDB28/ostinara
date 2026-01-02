"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { MoodDistribution } from "@/types";

interface MoodDistributionChartProps {
  data: MoodDistribution[];
}

export function MoodDistributionChart({ data }: MoodDistributionChartProps) {
  const totalSessions = data.reduce((sum, d) => sum + d.count, 0);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Humeur des sessions</h3>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <svg className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
          </svg>
          <p className="text-sm">Enregistre ton humeur dans tes sessions</p>
          <p className="text-xs mt-1">pour voir la distribution</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Humeur des sessions</h3>
        <span className="text-sm text-muted-foreground">
          {totalSessions} sessions
        </span>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data as unknown as Record<string, unknown>[]}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="count"
              nameKey="label"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as MoodDistribution;
                  return (
                    <div className="bg-popover text-popover-foreground rounded-lg shadow-lg border border-border px-3 py-2">
                      <p className="font-medium">
                        {item.emoji} {item.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.count} sessions ({item.percentage}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Légende stylée */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {data.map((item) => (
          <div
            key={item.mood}
            className="flex items-center gap-1.5 text-sm px-2 py-1 rounded-md bg-muted/30"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.emoji}</span>
            <span className="font-medium">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
