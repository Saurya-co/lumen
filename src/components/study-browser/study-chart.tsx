"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import type { FocusSession } from "@/lib/types";

/**
 * StudyChart — a small bar chart showing minutes studied per day for the
 * last 7 days. Uses the existing recharts dependency. Renders inside the
 * Library → Focus sessions tab.
 */
export function StudyChart({ sessions }: { sessions: FocusSession[] }) {
  const data = useMemo(() => {
    // Build last 7 days
    const days: { label: string; key: string; minutes: number; sessions: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({
        label: dayLabels[d.getDay()],
        key: d.toISOString().slice(0, 10),
        minutes: 0,
        sessions: 0,
      });
    }
    // Bucket sessions
    for (const f of sessions) {
      const k = new Date(f.startedAt).toISOString().slice(0, 10);
      const day = days.find((d) => d.key === k);
      if (day) {
        day.minutes += Math.floor(f.durationSec / 60);
        day.sessions += 1;
      }
    }
    return days;
  }, [sessions]);

  const maxMin = Math.max(...data.map((d) => d.minutes), 1);
  const totalMin = data.reduce((acc, d) => acc + d.minutes, 0);
  const avgMin = Math.round(totalMin / 7);

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Last 7 days</p>
          <p className="text-sm font-medium text-foreground">
            {totalMin} min studied <span className="text-muted-foreground">· avg {avgMin}m/day</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[oklch(0.82_0.12_84)]" />
          completed ·
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          partial
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "oklch(0.62 0.008 260)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "oklch(0.62 0.008 260)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
              contentStyle={{
                background: "oklch(0.16 0.006 260 / 0.95)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                borderRadius: "0.5rem",
                fontSize: "0.7rem",
                color: "oklch(0.96 0.004 260)",
                backdropFilter: "blur(12px)",
              }}
              labelStyle={{ color: "oklch(0.62 0.008 260)" }}
              formatter={(v: number) => [`${v} min`, "studied"]}
            />
            <Bar dataKey="minutes" radius={[3, 3, 0, 0]} maxBarSize={32}>
              {data.map((_, i) => (
                <Cell key={i} fill="oklch(0.82 0.12 84)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Tiny day strip below chart */}
      <div className="mt-2 flex justify-between px-1">
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="w-1 rounded-full bg-[oklch(0.82_0.12_84)]"
              style={{ height: `${Math.max(2, (d.minutes / maxMin) * 24)}px` }}
            />
            <span className="text-[0.55rem] text-muted-foreground">{d.label.slice(0, 2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
