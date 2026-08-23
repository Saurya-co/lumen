"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

const VERSION_KEY = "lumen-seen-version";
const CURRENT_VERSION = "1.0.0";

const CHANGELOG: Record<string, string[]> = {
  "1.0.0": [
    "New Dashboard tab in Library — 30-day study chart + focus donut + recent activity",
    "Smart Bookmarks with frecency grouping by portal",
    "PDF viewer with contextual Explain/Summarize/Annotate actions",
    "Continue Studying resume prompt when re-opening saved lectures",
    "Focus timer with pause/resume + break hint",
    "AI streaming responses (token-by-token typewriter)",
    "Ctrl+Shift+/ shortcuts reference card",
    "Toast notifications for all actions",
  ],
};

/**
 * WhatsNewChip — a small dismissible chip that appears in the bottom-left
 * corner on first launch after a version update. Shows the changelog for
 * the current version. Persists dismissal per-version so it only shows
 * once per new release.
 */
export function WhatsNewChip() {
  const [visible, setVisible] = useState(false);
  const focusActive = useStore((st) => st.focusActive);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(VERSION_KEY);
      if (seen !== CURRENT_VERSION) {
        // Show after a short delay so it doesn't fight with the portal picker
        const t = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage might be blocked — silently skip
    }
  }, []);

  // Never distract during a focus session
  if (focusActive) return null;

  function dismiss() {
    try {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } catch { /* noop */ }
    setVisible(false);
  }

  const changes = CHANGELOG[CURRENT_VERSION] ?? [];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute bottom-4 right-4 z-40"
        >
          <div className="sb-glass sb-glass-gold rounded-2xl overflow-hidden w-80">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[oklch(0.82_0.12_84)]/20">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="sb-text-gold">
                    <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">What&apos;s new in Lumen</p>
                  <p className="text-[0.55rem] text-muted-foreground">v{CURRENT_VERSION}</p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Changelog */}
            <div className="max-h-60 overflow-y-auto sb-scroll p-3">
              <ul className="space-y-1.5">
                {changes.map((c, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-[0.7rem] leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[oklch(0.82_0.12_84)]" />
                    <span className="text-foreground/80">{c}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <span className="text-[0.6rem] text-muted-foreground">
                Press <span className="sb-kbd">Ctrl</span> <span className="sb-kbd">K</span> to explore
              </span>
              <button
                onClick={dismiss}
                className="rounded-md bg-[oklch(0.82_0.12_84)] px-2.5 py-1 text-[0.65rem] font-medium text-[oklch(0.13_0.004_260)] transition hover:bg-[oklch(0.88_0.10_84)]"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
