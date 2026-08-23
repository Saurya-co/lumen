"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";

/**
 * Achievements — study streak badges shown on the Dashboard.
 *
 * Computes the user's current streak and unlocks badges at milestones:
 *  - 🔥 3-day streak: "Getting started"
 *  - 🌟 7-day streak: "Week warrior"
 *  - 💎 14-day streak: "Fortnight focus"
 *  - 👑 30-day streak: "Month master"
 *  - 🚀 100-day streak: "Centurion"
 *
 * Also shows lifetime stats: total sessions, total minutes, longest streak.
 *
 * Locked badges are dimmed; unlocked badges are gold-tinted with a glow.
 * The next-unlocked badge shows progress (e.g. "5/7 days to Week warrior").
 */

interface Badge {
  id: string;
  icon: string;
  label: string;
  desc: string;
  threshold: number; // streak days required
  color: string;
}

const BADGES: Badge[] = [
  { id: "3day", icon: "🔥", label: "Getting started", desc: "3-day streak", threshold: 3, color: "oklch(0.65 0.18 40)" },
  { id: "7day", icon: "🌟", label: "Week warrior", desc: "7-day streak", threshold: 7, color: "oklch(0.82 0.12 84)" },
  { id: "14day", icon: "💎", label: "Fortnight focus", desc: "14-day streak", threshold: 14, color: "oklch(0.7 0.12 200)" },
  { id: "30day", icon: "👑", label: "Month master", desc: "30-day streak", threshold: 30, color: "oklch(0.6 0.14 300)" },
  { id: "100day", icon: "🚀", label: "Centurion", desc: "100-day streak", threshold: 100, color: "oklch(0.78 0.1 30)" },
];

export function Achievements() {
  const s = useStore();

  const { currentStreak, longestStreak, totalMin, totalSessions } = useMemo(() => {
    // Current streak (with yesterday grace period)
    const dayKeys = new Set(
      s.focusSessions.map((f) => new Date(f.startedAt).toISOString().slice(0, 10))
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().slice(0, 10);
    const yesterdayKey = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);

    let cur = 0;
    if (dayKeys.has(todayKey) || dayKeys.has(yesterdayKey)) {
      let cursor = dayKeys.has(todayKey) ? today : new Date(today.getTime() - 86400000);
      while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
        cur++;
        cursor = new Date(cursor.getTime() - 86400000);
      }
    }

    // Longest streak — scan all sessions
    let longest = 0;
    if (dayKeys.size > 0) {
      const sortedDays = Array.from(dayKeys).sort();
      let run = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1] + "T00:00:00");
        const curr = new Date(sortedDays[i] + "T00:00:00");
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        if (diffDays === 1) {
          run++;
        } else {
          longest = Math.max(longest, run);
          run = 1;
        }
      }
      longest = Math.max(longest, run, cur);
    }

    const tMin = s.focusSessions.reduce((acc, f) => acc + Math.floor(f.durationSec / 60), 0);
    return {
      currentStreak: cur,
      longestStreak: longest,
      totalMin: tMin,
      totalSessions: s.focusSessions.length,
    };
  }, [s.focusSessions]);

  // Find next badge to unlock
  const nextBadge = BADGES.find((b) => currentStreak < b.threshold);

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Achievements</p>
          <p className="text-sm font-medium text-foreground">
            {currentStreak > 0 ? `${currentStreak}🔥 current streak` : "Start studying to unlock badges"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Longest</p>
          <p className="text-sm font-medium sb-text-gold">{longestStreak} days</p>
        </div>
      </div>

      {/* Badges grid */}
      <div className="grid grid-cols-5 gap-2">
        {BADGES.map((badge, i) => {
          const unlocked = currentStreak >= badge.threshold;
          const progress = nextBadge && badge.id === nextBadge.id
            ? Math.min(100, (currentStreak / badge.threshold) * 100)
            : unlocked ? 100 : 0;
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="flex flex-col items-center text-center"
              title={`${badge.label} — ${badge.desc}${unlocked ? " (unlocked)" : ` (${currentStreak}/${badge.threshold} days)`}`}
            >
              {/* Badge icon */}
              <div className="relative mb-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition ${
                    unlocked
                      ? "ring-2 ring-offset-2 ring-offset-[oklch(0.10_0.005_260)]"
                      : "opacity-30 grayscale"
                  }`}
                  style={unlocked ? { background: `${badge.color}20`, boxShadow: `0 0 12px ${badge.color}40`, ["--tw-ring-color" as string]: badge.color } : {}}
                >
                  {badge.icon}
                </div>
                {/* Progress ring for next badge */}
                {!unlocked && progress > 0 && (
                  <svg className="absolute inset-0 h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                    <circle
                      cx="20" cy="20" r="18"
                      fill="none"
                      stroke={badge.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 18}`}
                      strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
                      className="transition-all duration-500"
                    />
                  </svg>
                )}
              </div>
              {/* Label */}
              <p className={`text-[0.55rem] leading-tight ${unlocked ? "text-foreground" : "text-muted-foreground/50"}`}>
                {badge.label}
              </p>
              {/* Progress text for next badge */}
              {!unlocked && progress > 0 && (
                <p className="text-[0.5rem] text-muted-foreground">
                  {currentStreak}/{badge.threshold}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Lifetime stats */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <div className="text-center">
          <p className="text-[0.55rem] uppercase tracking-wider text-muted-foreground">Sessions</p>
          <p className="text-sm font-light text-foreground">{totalSessions}</p>
        </div>
        <div className="text-center">
          <p className="text-[0.55rem] uppercase tracking-wider text-muted-foreground">Total time</p>
          <p className="text-sm font-light text-foreground">{totalMin}m</p>
        </div>
        <div className="text-center">
          <p className="text-[0.55rem] uppercase tracking-wider text-muted-foreground">Active days</p>
          <p className="text-sm font-light sb-text-gold">{new Set(s.focusSessions.map(f => new Date(f.startedAt).toISOString().slice(0, 10))).size}</p>
        </div>
      </div>
    </div>
  );
}
