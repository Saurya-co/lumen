"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { STUDY_PORTALS } from "@/lib/constants";
import type { StudyPortalId } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { LumenMark } from "@/components/ui/lumen-mark";

export function PortalPicker() {
  const s = useStore();
  const [selected, setSelected] = useState<StudyPortalId | null>(s.chosenPortalId);
  const [customUrl, setCustomUrl] = useState(s.customPortalUrl || "");
  const [lmsUrl, setLmsUrl] = useState(s.customLmsUrl || "");

  const selectedPortal = selected ? STUDY_PORTALS.find((p) => p.id === selected) : null;

  function confirm() {
    if (!selected) return;
    if (selected === "custom" && !customUrl) return;
    if (selected === "lms" && !lmsUrl) return;
    s.setPortal(selected, { customUrl, lmsUrl });
  }

  function skip() {
    // Open the demo study surface directly
    if (s.activeTabId) {
      s.setTabUrl(s.activeTabId, "/study-surface", "Study Surface (demo)");
    }
    s.setOverlay(s.settings.onboardingCompleted ? null : "onboarding");
  }

  // Escape skips portal selection — the first-run screen owns the keyboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Backdrop>
      <div className="relative z-10 w-full max-w-3xl px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl sb-glass sb-glass-gold"
          >
            <LumenMark size={36} />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-light tracking-tight text-foreground"
          >
            Welcome to <span className="sb-text-gold font-normal">Lumen</span>
          </motion.h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose your study website — it becomes the entire screen.
          </p>
        </div>

        {/* Portal grid */}
        <div className="sb-glass rounded-2xl p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STUDY_PORTALS.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                onClick={() => setSelected(p.id)}
                className={`group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
                  selected === p.id
                    ? "border-[oklch(0.82_0.12_84)] bg-[oklch(0.82_0.12_84)]/10"
                    : "border-border bg-secondary/30 hover:bg-secondary/60"
                }`}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ background: p.color }}
                >
                  {p.glyph}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="mt-0.5 text-[0.7rem] leading-tight text-muted-foreground">
                    {p.description}
                  </p>
                </div>
                {selected === p.id && (
                  <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[oklch(0.82_0.12_84)] text-[oklch(0.13_0.004_260)]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Conditional URL inputs */}
          <AnimatePresence>
            {selected === "custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-1 pt-3"
              >
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Website URL
                </label>
                <input
                  autoFocus
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirm()}
                  placeholder="https://your-study-site.com"
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
                />
              </motion.div>
            )}
            {selected === "lms" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-1 pt-3"
              >
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  College LMS URL (Moodle / Canvas / Blackboard)
                </label>
                <input
                  autoFocus
                  type="url"
                  value={lmsUrl}
                  onChange={(e) => setLmsUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirm()}
                  placeholder="https://lms.yourcollege.edu"
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={skip}
            className="rounded-lg px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Skip — use demo study surface
          </button>
          <div className="flex items-center gap-2">
            {selectedPortal && (
              <p className="hidden text-xs text-muted-foreground sm:block">
                {selectedPortal.name} opens fullscreen
              </p>
            )}
            <button
              onClick={confirm}
              disabled={!selected || (selected === "custom" && !customUrl) || (selected === "lms" && !lmsUrl)}
              autoFocus
              className="rounded-lg bg-[oklch(0.82_0.12_84)] px-5 py-2 text-sm font-medium text-[oklch(0.13_0.004_260)] transition hover:bg-[oklch(0.88_0.10_84)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Open &amp; study
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}

export function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="sb-deepspace sb-stars sb-anim-fade absolute inset-0 z-50 flex items-center justify-center">
      <div className="relative z-10">{children}</div>
    </div>
  );
}
