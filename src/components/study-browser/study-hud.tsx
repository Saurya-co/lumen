"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { isNative } from "@/lib/native-bridge";

/**
 * StudyHUD — a tiny, unobtrusive chip in the top-right corner that shows
 * the current study session time. Only appears when:
 *  - no overlay is active
 *  - the active tab has a study URL
 *  - tracking is enabled in settings
 *
 * It deliberately sits in the corner with low opacity so it never
 * interferes with the study website. Clicking it opens the Library
 * (Focus sessions tab) so you can review your history.
 */
export function StudyHUD() {
  const s = useStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000); // 30s — low overhead
    return () => clearInterval(t);
  }, []);

  if (s.overlay) return null;
  if (s.focusActive && s.settings.focusMode.hideTimer) return null;
  if (!s.settings.tracking.enabled) return null;
  if (isNative()) return null; // native build shows its own menubar
  const activeTab = s.tabs.find((t) => t.id === s.activeTabId);
  if (!activeTab?.url) return null;

  // Compute current session time
  const sessionSec = s.sessionStart
    ? Math.floor((Date.now() - s.sessionStart) / 1000)
    : 0;
  const totalSec = s.studySeconds + sessionSec;
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);

  const label =
    hours > 0 ? `${hours}h ${mins}m` : mins > 0 ? `${mins}m` : `<1m`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 0.55, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute right-3 top-3 z-30"
      >
        <div className="flex items-center gap-2">
          {/* Paused indicator */}
          {s.tabsPaused && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => s.toggleTabsPaused()}
              title="Background tabs paused — click to resume"
              className="flex items-center gap-1.5 rounded-full border border-[oklch(0.7_0.12_200)]/30 bg-[oklch(0.7_0.12_200)]/10 px-2.5 py-1 text-[0.65rem] text-[oklch(0.7_0.12_200)] backdrop-blur-md transition hover:bg-[oklch(0.7_0.12_200)]/20"
            >
              <span className="flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-[oklch(0.7_0.12_200)] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.12_200)]" />
              </span>
              <span className="font-medium">Tabs paused</span>
            </motion.button>
          )}
          {/* Study time */}
          <button
            onClick={() => s.setOverlay("library")}
            title="Study time today · click for sessions"
            className="flex items-center gap-2 rounded-full border border-white/5 bg-black/40 px-2.5 py-1 text-[0.65rem] text-white/60 backdrop-blur-md transition hover:bg-black/60 hover:text-white"
          >
            <span className="flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-[oklch(0.82_0.12_84)] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[oklch(0.82_0.12_84)]" />
            </span>
            <span className="font-medium tabular-nums">{label}</span>
            <span className="text-white/40">·</span>
            <span className="text-white/40">studied</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
