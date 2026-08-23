"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useStore } from "@/lib/store";
import { PORTAL_MAP } from "@/lib/constants";
import type { StudyPortalId, FocusSession } from "@/lib/types";
import { StudyGoals } from "./study-goals";
import { StudyCalendar } from "./study-calendar";
import { Achievements } from "./achievements";

type Range = "today" | "week" | "month" | "all";

const RANGE_DAYS: Record<Range, number> = {
  today: 1,
  week: 7,
  month: 30,
  all: 365,
};

const RANGE_LABEL: Record<Range, string> = {
  today: "Today",
  week: "7 days",
  month: "30 days",
  all: "All time",
};

/**
 * StudyDashboard — the default landing view of the Study Library.
 *
 * Features:
 *  - Time-range filter (Today / 7 days / 30 days / All time)
 *  - Big stats row: total study time, focus sessions, streak, bookmarks
 *  - Cumulative study-time area chart (scales to range)
 *  - Donut chart of focus time by portal (uses session.portalId)
 *  - "Continue studying" list of recent saved lectures
 *  - "Recent activity" timeline
 */
export function StudyDashboard() {
  const s = useStore();
  const [range, setRange] = useState<Range>("week");

  // Keyboard: 1=Today, 2=Week, 3=Month, 4=All (only when no text input focused)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "1") { e.preventDefault(); setRange("today"); }
      else if (e.key === "2") { e.preventDefault(); setRange("week"); }
      else if (e.key === "3") { e.preventDefault(); setRange("month"); }
      else if (e.key === "4") { e.preventDefault(); setRange("all"); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Filter sessions by range
  const filteredSessions = useMemo(() => {
    if (range === "all") return s.focusSessions;
    const cutoff = Date.now() - RANGE_DAYS[range] * 86400000;
    return s.focusSessions.filter((f) => f.startedAt >= cutoff);
  }, [s.focusSessions, range]);

  // Daily data for area chart
  const dailyData = useMemo(() => {
    const days = RANGE_DAYS[range];
    const arr: { label: string; date: string; minutes: number; cumulative: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const step = days > 30 ? Math.ceil(days / 15) : 1;
    for (let i = days - 1; i >= 0; i -= step) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      let dayMinutes = 0;
      if (step === 1) {
        dayMinutes = filteredSessions
          .filter((f) => new Date(f.startedAt).toISOString().slice(0, 10) === key)
          .reduce((acc, f) => acc + Math.floor(f.durationSec / 60), 0);
      } else {
        // Aggregate over the step window
        const endKey = new Date(d.getTime() + step * 86400000).toISOString().slice(0, 10);
        dayMinutes = filteredSessions
          .filter((f) => {
            const fk = new Date(f.startedAt).toISOString().slice(0, 10);
            return fk >= key && fk < endKey;
          })
          .reduce((acc, f) => acc + Math.floor(f.durationSec / 60), 0);
      }
      arr.push({
        label: days <= 7
          ? d.toLocaleDateString("en-US", { weekday: "short" })
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        date: key,
        minutes: dayMinutes,
        cumulative: 0,
      });
    }
    let cum = 0;
    for (const d of arr) {
      cum += d.minutes;
      d.cumulative = cum;
    }
    return arr;
  }, [filteredSessions, range]);

  const totalMin = filteredSessions.reduce((acc, f) => acc + Math.floor(f.durationSec / 60), 0);
  const totalSessions = filteredSessions.length;
  const completedSessions = filteredSessions.filter((f) => f.completed).length;
  const notesCount = s.notes.length;
  const bookmarksCount = s.library.filter((l) => l.kind === "bookmark").length;

  // Streak: consecutive days (ending today or yesterday) with ≥1 focus session
  const streak = useMemo(() => {
    if (s.focusSessions.length === 0) return 0;
    const dayKeys = new Set(
      s.focusSessions.map((f) => new Date(f.startedAt).toISOString().slice(0, 10))
    );
    let count = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // Allow streak to count if studied today OR yesterday (grace period)
    const todayKey = d.toISOString().slice(0, 10);
    const yesterdayKey = new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
    if (!dayKeys.has(todayKey) && !dayKeys.has(yesterdayKey)) return 0;
    // If studied yesterday but not today, start from yesterday
    let cursor = dayKeys.has(todayKey) ? d : new Date(d.getTime() - 86400000);
    while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
      count++;
      cursor = new Date(cursor.getTime() - 86400000);
    }
    return count;
  }, [s.focusSessions]);

  // Donut: focus time by portal (uses session.portalId)
  const donutData = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of filteredSessions) {
      let portalName = "Other";
      if (f.portalId && PORTAL_MAP[f.portalId as StudyPortalId]) {
        portalName = PORTAL_MAP[f.portalId as StudyPortalId].name;
      } else if (f.url?.includes("/study-surface")) {
        portalName = "Demo lecture";
      } else if (f.url?.includes("/pdf-viewer")) {
        portalName = "PDF viewer";
      }
      m.set(portalName, (m.get(portalName) ?? 0) + Math.floor(f.durationSec / 60));
    }
    if (m.size === 0) {
      return [{ name: "No data", value: 1, color: "oklch(0.21 0.006 260)" }];
    }
    const colors = [
      "oklch(0.82 0.12 84)",
      "oklch(0.7 0.12 200)",
      "oklch(0.65 0.18 40)",
      "oklch(0.6 0.14 300)",
      "oklch(0.7 0.16 160)",
      "oklch(0.78 0.1 30)",
    ];
    return Array.from(m.entries()).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [filteredSessions]);

  // Continue studying — recent saved lectures
  const continueStudying = useMemo(() => {
    return s.library
      .filter((l) => l.kind === "lecture")
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 4);
  }, [s.library]);

  // Recent activity timeline
  const recentActivity = useMemo(() => {
    const items: { kind: string; title: string; subtitle: string; ts: number; icon: string }[] = [];
    for (const n of s.notes.slice(0, 5)) {
      items.push({
        kind: "note",
        title: n.text.slice(0, 60),
        subtitle: n.tabTitle ?? "Quick note",
        ts: n.createdAt,
        icon: "📝",
      });
    }
    for (const l of s.library.slice(0, 5)) {
      items.push({
        kind: l.kind,
        title: l.title,
        subtitle: l.url ?? "",
        ts: l.createdAt,
        icon: l.kind === "bookmark" ? "★" : l.kind === "pdf" ? "📄" : l.kind === "lecture" ? "🎬" : "📝",
      });
    }
    for (const f of s.focusSessions.slice(0, 3)) {
      items.push({
        kind: "focus",
        title: f.tabTitle ?? "Focus session",
        subtitle: `${Math.floor(f.durationSec / 60)} min · ${f.completed ? "completed" : "partial"}`,
        ts: f.startedAt,
        icon: "🎯",
      });
    }
    return items.sort((a, b) => b.ts - a.ts).slice(0, 8);
  }, [s.notes, s.library, s.focusSessions]);

  const hasData = s.focusSessions.length > 0 || notesCount > 0 || s.library.length > 0;

  // Tip of the day — picks one based on day-of-year so it rotates daily
  const tipOfDay = useMemo(() => {
    const tips = [
      "Break study into 25-minute focus blocks — your brain retains more in short, intense bursts.",
      "Teach what you just learned to an imaginary student. If you can't explain it simply, you don't understand it yet.",
      "Active recall beats re-reading. Close the book and write down everything you remember.",
      "Spaced repetition: review notes after 1 day, 3 days, 1 week. Lumen's library keeps them ready.",
      "Sleep is when memories consolidate. An all-nighter costs more than it earns.",
      "Switch subjects every 90 minutes to prevent interference and keep attention fresh.",
      "The Feynman technique: name the concept, explain it simply, find gaps, refine.",
      "Interleaving different problem types beats doing the same type repeatedly.",
      "Take a 5-minute walk after a focus block — movement helps cement what you learned.",
      "Difficult first: tackle the hardest topic when your energy is highest.",
    ];
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return tips[dayOfYear % tips.length];
  }, []);

  if (!hasData) {
    return (
      <div className="py-8">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl sb-glass sb-glass-gold mx-auto">
            <span className="text-2xl">📊</span>
          </div>
          <p className="mb-1 text-sm font-medium text-foreground">Your study dashboard</p>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            Once you start studying, saving notes, or running focus sessions, your progress will appear here as charts, stats, and a recent-activity timeline.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => s.startFocus()}
              className="rounded-md bg-[oklch(0.82_0.12_84)] px-3 py-1.5 text-xs font-medium text-[oklch(0.13_0.004_260)] hover:bg-[oklch(0.88_0.10_84)]"
            >
              🎯 Start focus
            </button>
            <button
              onClick={() => s.setOverlay("quick-note")}
              className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              📝 Quick note
            </button>
          </div>
          <p className="mt-6 text-[0.65rem] text-muted-foreground/60">
            💡 Tip: press <span className="sb-text-gold font-medium">Ctrl+Shift+L</span> any time to open this dashboard.
          </p>
          {/* Tip of the day */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 mx-auto max-w-sm rounded-lg border border-[oklch(0.82_0.12_84)]/20 bg-[oklch(0.82_0.12_84)]/5 p-3 text-left"
          >
            <p className="mb-1 text-[0.55rem] font-medium uppercase tracking-wider sb-text-gold">
              💡 Tip of the day
            </p>
            <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
              {tipOfDay}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Range filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-0.5">
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-[0.65rem] font-medium transition ${
                range === r
                  ? "bg-[oklch(0.82_0.12_84)] text-[oklch(0.13_0.004_260)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        <span className="text-[0.6rem] text-muted-foreground">
          showing {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Big stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Study time" value={`${totalMin}m`} icon="⏱" gold />
        <StatTile label="Focus sessions" value={`${completedSessions}/${totalSessions}`} icon="🎯" />
        <StatTile
          label="Day streak"
          value={streak > 0 ? `${streak}🔥` : "0"}
          icon={streak > 0 ? "🔥" : "○"}
          gold={streak >= 3}
        />
        <StatTile label="Bookmarks" value={`${bookmarksCount}`} icon="★" />
      </div>

      {/* Study goals */}
      <StudyGoals />

      {/* Achievements */}
      <Achievements />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Cumulative area chart */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                Study time · {RANGE_LABEL[range]}
              </p>
              <p className="text-sm font-medium text-foreground">
                {totalMin} min total{" "}
                <span className="text-muted-foreground">
                  · {dailyData.length > 0 ? Math.round((totalMin / dailyData.length) * 10) / 10 : 0}m/day avg
                </span>
              </p>
            </div>
            <span className="rounded-full bg-[oklch(0.82_0.12_84)]/15 px-2 py-0.5 text-[0.55rem] font-medium sb-text-gold">
              cumulative
            </span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="studyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.82 0.12 84)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.82 0.12 84)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "oklch(0.62 0.008 260)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "oklch(0.62 0.008 260)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.16 0.006 260 / 0.95)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: "0.5rem",
                    fontSize: "0.7rem",
                    color: "oklch(0.96 0.004 260)",
                    backdropFilter: "blur(12px)",
                  }}
                  formatter={(v: number, n: string) => [`${v} min`, n === "cumulative" ? "total" : "today"]}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="oklch(0.82 0.12 84)"
                  strokeWidth={2}
                  fill="url(#studyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut: focus time by portal */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <div className="mb-3">
            <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Focus by source</p>
            <p className="text-sm font-medium text-foreground">{donutData.length} source{donutData.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="relative h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={56}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.16 0.006 260 / 0.95)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: "0.5rem",
                    fontSize: "0.7rem",
                    color: "oklch(0.96 0.004 260)",
                  }}
                  formatter={(v: number, n: string) => [`${v} min`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-light text-foreground tabular-nums">{totalMin}</span>
              <span className="text-[0.55rem] uppercase tracking-wider text-muted-foreground">min</span>
            </div>
          </div>
          {/* Legend */}
          <div className="mt-2 space-y-0.5">
            {donutData.slice(0, 4).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[0.6rem]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </span>
                <span className="tabular-nums text-foreground/70">{d.value}m</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Continue studying + Recent activity */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Continue studying */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.6rem] font-medium uppercase tracking-wider sb-text-gold">Continue studying</p>
          </div>
          {continueStudying.length === 0 ? (
            <p className="py-4 text-center text-[0.7rem] text-muted-foreground">
              No saved lectures yet. Use Ctrl+K → Save lecture position while watching.
            </p>
          ) : (
            <div className="space-y-1.5">
              {continueStudying.map((l) => {
                const portal = l.portalId ? PORTAL_MAP[l.portalId] : null;
                return (
                  <button
                    key={l.id}
                    onClick={() => {
                      if (l.url) {
                        s.newTab(l.url, l.title, l.portalId);
                        s.visitLibraryItem(l.id);
                        s.closeOverlay();
                      }
                    }}
                    className="group flex w-full items-center gap-2.5 rounded-lg border border-border bg-background/30 p-2 text-left transition hover:bg-secondary/60"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[0.55rem] font-bold text-white"
                      style={{ background: portal?.color ?? "#a16207" }}
                    >
                      {portal?.glyph ?? "🎬"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{l.title}</p>
                      <p className="text-[0.55rem] text-muted-foreground">
                        {l.position?.videoTimeSec ? `at ${Math.floor(l.position.videoTimeSec / 60)}:${String(l.position.videoTimeSec % 60).padStart(2, "0")}` : "saved"} · {timeAgo(l.updatedAt)}
                      </p>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-muted-foreground opacity-0 transition group-hover:opacity-100">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <p className="mb-2 text-[0.6rem] font-medium uppercase tracking-wider sb-text-gold">Recent activity</p>
          {recentActivity.length === 0 ? (
            <p className="py-4 text-center text-[0.7rem] text-muted-foreground">
              No activity yet. Start studying to see your timeline here.
            </p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg px-1.5 py-1 transition hover:bg-secondary/30">
                  <span className="text-sm">{a.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-foreground">{a.title}</p>
                    <p className="truncate text-[0.55rem] text-muted-foreground">{a.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-[0.55rem] text-muted-foreground">{timeAgo(a.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Study calendar heatmap */}
      <StudyCalendar />
    </div>
  );
}

function StatTile({ label, value, icon, gold }: { label: string; value: string; icon: string; gold?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-secondary/30 p-3"
    >
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className={`text-sm ${gold ? "sb-text-gold" : "text-muted-foreground/60"}`}>{icon}</span>
      </div>
      <p className={`text-lg font-light ${gold ? "sb-text-gold" : "text-foreground"}`}>{value}</p>
    </motion.div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
