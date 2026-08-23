"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";

/**
 * StudyCalendar — a GitHub-style contribution heatmap showing study
 * intensity per day for the last 90 days.
 *
 * Each cell is a day. Color intensity maps to minutes studied that day:
 *   0 min    → empty (very dark)
 *   1-15     → level 1
 *   16-30    → level 2
 *   31-60    → level 3
 *   60+      → level 4 (full gold)
 *
 * Rows are weekdays (Sun–Sat), columns are weeks. The current day is
 * outlined in gold. Hovering a cell shows a tooltip with the date + minutes.
 */
export function StudyCalendar() {
  const s = useStore();

  const { weeks, monthLabels, totalDays, activeDays } = useMemo(() => {
    // Build a 90-day grid ending today.
    // GitHub heatmaps use weeks as columns (7 rows = Sun..Sat).
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the Sunday of the current week (or today if today is Sunday)
    const todayDow = today.getDay(); // 0 = Sun
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - todayDow);

    // We want ~13 weeks (91 days) ending at end of this week
    const numWeeks = 13;
    const firstSunday = new Date(startOfThisWeek);
    firstSunday.setDate(startOfThisWeek.getDate() - (numWeeks - 1) * 7);

    // Bucket minutes per day
    const dayMap = new Map<string, number>();
    for (const f of s.focusSessions) {
      const key = new Date(f.startedAt).toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + Math.floor(f.durationSec / 60));
    }

    const weeks: { date: Date; key: string; minutes: number; isToday: boolean; isFuture: boolean }[][] = [];
    for (let w = 0; w < numWeeks; w++) {
      const week: { date: Date; key: string; minutes: number; isToday: boolean; isFuture: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(firstSunday);
        date.setDate(firstSunday.getDate() + w * 7 + d);
        const key = date.toISOString().slice(0, 10);
        const minutes = dayMap.get(key) ?? 0;
        const isToday = key === today.toISOString().slice(0, 10);
        const isFuture = date.getTime() > today.getTime();
        week.push({ date, key, minutes, isToday, isFuture });
      }
      weeks.push(week);
    }

    // Month labels — show month abbreviation at the first week of each month
    const monthLabels: { weekIdx: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const m = week[0].date.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({
          weekIdx: wi,
          label: week[0].date.toLocaleDateString("en-US", { month: "short" }),
        });
        lastMonth = m;
      }
    });

    let activeDays = 0;
    for (const week of weeks) {
      for (const day of week) {
        if (day.minutes > 0) activeDays++;
      }
    }

    return { weeks, monthLabels, totalDays: numWeeks * 7, activeDays };
  }, [s.focusSessions]);

  function level(minutes: number): number {
    if (minutes === 0) return 0;
    if (minutes <= 15) return 1;
    if (minutes <= 30) return 2;
    if (minutes <= 60) return 3;
    return 4;
  }

  const levelColors = [
    "oklch(0.16 0.005 260)", // 0 — empty
    "oklch(0.82 0.12 84 / 0.25)", // 1
    "oklch(0.82 0.12 84 / 0.45)", // 2
    "oklch(0.82 0.12 84 / 0.7)", // 3
    "oklch(0.82 0.12 84)", // 4 — full gold
  ];

  const totalMin = s.focusSessions.reduce((acc, f) => acc + Math.floor(f.durationSec / 60), 0);

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Study calendar</p>
          <p className="text-sm font-medium text-foreground">
            {activeDays} active day{activeDays !== 1 ? "s" : ""}{" "}
            <span className="text-muted-foreground">· {totalMin} min total</span>
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[0.55rem] text-muted-foreground">
          <span>Less</span>
          {levelColors.map((c, i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: c }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto sb-no-scrollbar">
        <div className="inline-block">
          {/* Month labels row */}
          <div className="mb-1 flex">
            <div className="w-7" /> {/* spacer for weekday labels */}
            {weeks.map((_, wi) => (
              <div key={wi} className="w-3.5 text-[0.5rem] text-muted-foreground">
                {monthLabels.find((m) => m.weekIdx === wi)?.label ?? ""}
              </div>
            ))}
          </div>

          {/* Weekday rows */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, di) => (
            <div key={di} className="mb-0.5 flex items-center">
              <div className="w-7 text-[0.5rem] text-muted-foreground/70">
                {di % 2 === 0 ? dayName : ""}
              </div>
              {weeks.map((week, wi) => {
                const day = week[di];
                if (!day) return <div key={wi} className="w-3.5" />;
                const lvl = level(day.minutes);
                return (
                  <div
                    key={wi}
                    className="group relative mr-0.5 h-3 w-3.5"
                    title={`${day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${day.minutes} min`}
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15, delay: Math.min(wi * 0.01 + di * 0.005, 0.3) }}
                      className={`h-full w-full rounded-sm relative ${day.isFuture ? "opacity-20" : ""} ${day.isToday ? "ring-1 ring-[oklch(0.82_0.12_84)] ring-offset-0" : ""}`}
                      style={{
                        background: levelColors[lvl],
                      }}
                    >
                      {day.isToday && (
                        <motion.div
                          className="absolute inset-0 rounded-sm border border-[oklch(0.82_0.12_84)]"
                          animate={{
                            opacity: [0.4, 1, 0.4],
                            scale: [1, 1.08, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </motion.div>
                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[0.55rem] text-popover-foreground shadow-lg group-hover:block">
                      {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      <span className="ml-1 sb-text-gold">{day.minutes}m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
