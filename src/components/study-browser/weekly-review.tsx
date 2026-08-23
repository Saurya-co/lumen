"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { sbToast } from "@/lib/toast";

const REVIEW_KEY = "lumen-weekly-review-seen";

/**
 * WeeklyReview — checks on mount if it's time for a weekly study review.
 *
 * Triggers on Sunday between 20:00 and 21:00 (configurable window) if the
 * user hasn't seen the review this week. Shows a toast summarizing the
 * week's study time vs goal, with a CTA to open the Dashboard.
 *
 * The review is dismissible and won't fire again until the following week.
 * Uses localStorage to track the last-shown week key (ISO year-week).
 */
export function WeeklyReview() {
  const s = useStore();
  const shownRef = useRef(false);

  // Defensive: s.settings.goals may be undefined for users with persisted
  // state from before the goals field was added. Fall back to defaults.
  const weeklyGoal = s.settings?.goals?.weeklyMin ?? 300;

  useEffect(() => {
    if (shownRef.current) return;

    function getISOWeek(d: Date): string {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      // Thursday in current week decides the year
      date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
      const week1 = new Date(date.getFullYear(), 0, 4);
      const weekNo =
        1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      return `${date.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
    }

    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const hour = now.getHours();

    // Sunday 20:00–21:00
    const inWindow = day === 0 && hour >= 20 && hour < 21;
    if (!inWindow) return;

    const weekKey = getISOWeek(now);
    try {
      const seen = localStorage.getItem(REVIEW_KEY);
      if (seen === weekKey) return; // already shown this week
    } catch {
      return;
    }

    // Compute week stats
    const weekAgo = Date.now() - 7 * 86400000;
    const weekSessions = s.focusSessions.filter((f) => f.startedAt >= weekAgo);
    const weekMin = weekSessions.reduce((acc, f) => acc + Math.floor(f.durationSec / 60), 0);
    const completedCount = weekSessions.filter((f) => f.completed).length;
    const goalPct = weeklyGoal > 0 ? Math.round((weekMin / weeklyGoal) * 100) : 0;
    const goalReached = weekMin >= weeklyGoal;

    const title = goalReached
      ? "🎉 Weekly goal reached!"
      : "📊 Weekly study review";
    const desc = goalReached
      ? `${weekMin} min studied this week (${goalPct}% of goal). Great work — enjoy your Sunday evening.`
      : `${weekMin} min studied · ${goalPct}% of ${weeklyGoal}min goal · ${completedCount} sessions. Open the Dashboard for details.`;

    // Show as a longer-duration toast with an action button feel
    sbToast.info(title, desc);
    // Mark as seen
    try {
      localStorage.setItem(REVIEW_KEY, weekKey);
    } catch {
      /* noop */
    }
    shownRef.current = true;
  }, [s.focusSessions, weeklyGoal]);

  return null;
}
