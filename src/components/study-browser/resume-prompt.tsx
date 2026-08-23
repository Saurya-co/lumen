"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { sbToast } from "@/lib/toast";
import { LumenMark } from "@/components/ui/lumen-mark";

/**
 * ResumePrompt — a tiny, dismissible chip that appears in the top-center
 * when the user re-opens a study URL that has a saved lecture position.
 *
 * The chip shows "Resume where you left off?" with the saved position
 * (video timestamp or scroll %) and offers Resume / Start over / Dismiss.
 *
 * In the web preview we can't actually seek the cross-origin iframe, but
 * the chip demonstrates the UX. In the Electron build, the NativeBridge
 * posts the resume position to a preload script that calls
 * `video.currentTime = sec` on the study webContents.
 */
export function ResumePrompt() {
  const s = useStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const activeTab = s.tabs.find((t) => t.id === s.activeTabId);

  // Derived — computed inline (cheap: library is small).
  let matched: typeof s.library[number] | null = null;
  if (activeTab?.url && !s.overlay) {
    matched =
      s.library.find(
        (l) => l.kind === "lecture" && l.url === activeTab.url && !dismissed.has(l.id)
      ) ?? null;
  }

  if (!matched || !matched.position) return null;

  const pos = matched.position;
  const hasVideo = typeof pos.videoTimeSec === "number" && pos.videoTimeSec > 0;
  const hasScroll = typeof pos.scrollRatio === "number" && pos.scrollRatio > 0;

  const label = hasVideo
    ? formatTime(pos.videoTimeSec!)
    : hasScroll
      ? `${Math.round(pos.scrollRatio! * 100)}% scrolled`
      : "saved position";

  function resume() {
    // In the web preview we can't seek the iframe; in Electron the
    // NativeBridge would post the position to the preload script.
    sbToast.info("Resume requested", `Would seek to ${label} in the desktop build.`);
    setDismissed((d) => new Set(d).add(matched!.id));
  }

  function startOver() {
    s.reloadTab();
    setDismissed((d) => new Set(d).add(matched!.id));
  }

  function dismiss() {
    setDismissed((d) => new Set(d).add(matched!.id));
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute left-1/2 top-3 z-30 -translate-x-1/2"
      >
        <div className="sb-glass sb-glass-gold rounded-full pl-3 pr-1.5 py-1.5 flex items-center gap-3 shadow-2xl">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[oklch(0.82_0.12_84)]/20">
            <LumenMark size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[0.65rem] font-medium text-foreground leading-tight">
              Resume where you left off?
            </span>
            <span className="text-[0.6rem] text-muted-foreground leading-tight">
              {label} · saved {timeAgo(matched.updatedAt)}
            </span>
          </div>
          <div className="ml-1 flex items-center gap-1">
            <button
              onClick={resume}
              className="rounded-full bg-[oklch(0.82_0.12_84)] px-2.5 py-1 text-[0.65rem] font-medium text-[oklch(0.13_0.004_260)] transition hover:bg-[oklch(0.88_0.10_84)]"
            >
              Resume
            </button>
            <button
              onClick={startOver}
              className="rounded-full px-2 py-1 text-[0.65rem] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              Start over
            </button>
            <button
              onClick={dismiss}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              title="Dismiss"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
