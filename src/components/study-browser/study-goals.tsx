"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";

/**
 * StudyGoals — daily and weekly study-time goal progress bars.
 *
 * Shows the user's progress toward their configured daily (default 60 min)
 * and weekly (default 300 min) study-time goals. Goals are configurable
 * in Settings → Focus.
 *
 * Renders inside the Study Dashboard above the charts row.
 */
export function StudyGoals() {
  const s = useStore();

  const { dailyMin, weeklyMin, todayMin, weekMin } = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const weekAgo = Date.now() - 7 * 86400000;

    let todayM = 0;
    let weekM = 0;
    for (const f of s.focusSessions) {
      const m = Math.floor(f.durationSec / 60);
      const fKey = new Date(f.startedAt).toISOString().slice(0, 10);
      if (fKey === todayKey) todayM += m;
      if (f.startedAt >= weekAgo) weekM += m;
    }
    return {
      dailyMin: s.settings.goals.dailyMin,
      weeklyMin: s.settings.goals.weeklyMin,
      todayMin: todayM,
      weekMin: weekM,
    };
  }, [s.focusSessions, s.settings.goals.dailyMin, s.settings.goals.weeklyMin]);

  if (!s.settings.goals.enabled) return null;

  const dailyPct = Math.min(100, (todayMin / dailyMin) * 100);
  const weeklyPct = Math.min(100, (weekMin / weeklyMin) * 100);
  const dailyDone = todayMin >= dailyMin;
  const weeklyDone = weekMin >= weeklyMin;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Daily goal */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-secondary/30 p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{dailyDone ? "✅" : "🎯"}</span>
            <div>
              <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Daily goal</p>
              <p className="text-sm font-medium text-foreground">
                {todayMin} <span className="text-muted-foreground">/ {dailyMin} min</span>
              </p>
            </div>
          </div>
          {dailyDone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-[oklch(0.82_0.12_84)]/15 px-2 py-0.5 text-[0.55rem] font-medium sb-text-gold"
            >
              DONE
            </motion.span>
          )}
        </div>
        {/* Progress bar */}
        <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${dailyPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`h-full rounded-full ${
              dailyDone
                ? "bg-gradient-to-r from-[oklch(0.82_0.12_84)] to-[oklch(0.88_0.1_84)]"
                : "bg-[oklch(0.82_0.12_84)]"
            }`}
          />
          {/* Tick marks at 25/50/75% */}
          {[25, 50, 75].map((pct) => (
            <div
              key={pct}
              className="absolute top-0 h-full w-px bg-white/10"
              style={{ left: `${pct}%` }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[0.6rem] text-muted-foreground">
          {dailyDone
            ? `Goal reached! ${todayMin - dailyMin} min over target.`
            : `${dailyMin - todayMin} min to go`}
        </p>
      </motion.div>

      {/* Weekly goal */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl border border-border bg-secondary/30 p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{weeklyDone ? "✅" : "📅"}</span>
            <div>
              <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Weekly goal</p>
              <p className="text-sm font-medium text-foreground">
                {weekMin} <span className="text-muted-foreground">/ {weeklyMin} min</span>
              </p>
            </div>
          </div>
          {weeklyDone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-[oklch(0.82_0.12_84)]/15 px-2 py-0.5 text-[0.55rem] font-medium sb-text-gold"
            >
              DONE
            </motion.span>
          )}
        </div>
        {/* Progress bar */}
        <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${weeklyPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className={`h-full rounded-full ${
              weeklyDone
                ? "bg-gradient-to-r from-[oklch(0.82_0.12_84)] to-[oklch(0.88_0.1_84)]"
                : "bg-[oklch(0.82_0.12_84)]"
            }`}
          />
          {[25, 50, 75].map((pct) => (
            <div
              key={pct}
              className="absolute top-0 h-full w-px bg-white/10"
              style={{ left: `${pct}%` }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[0.6rem] text-muted-foreground">
          {weeklyDone
            ? `Goal reached! ${weekMin - weeklyMin} min over target.`
            : `${weeklyMin - weekMin} min to go this week`}
        </p>
      </motion.div>
    </div>
  );
}
