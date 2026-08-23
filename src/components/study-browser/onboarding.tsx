"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { Kbd } from "@/components/ui/kbd";
import { LumenMark } from "@/components/ui/lumen-mark";

/**
 * Onboarding — a cohesive FULLSCREEN welcome experience.
 *
 * Deliberately NOT a webpage-style landing card: no bordered container,
 * no dashboard layout. The deep-space background IS the screen; each step
 * renders as a native-feeling scene with one clear idea, one primary
 * action, and an always-available Skip. When it ends it disappears
 * completely — the study website becomes the entire window.
 */

const STEPS = [
  {
    title: "Your study website is the entire screen",
    body: "No address bar. No tabs. No bookmarks bar. The site you chose fills the whole window — Lumen never gets in the way while you study.",
    keys: null,
    visual: "fullscreen",
  },
  {
    title: "Ctrl+K — Study Command Center",
    body: "Fuzzy-search commands, switch tabs, take notes, start focus — every tool is one keystroke away.",
    keys: ["Ctrl", "K"],
    visual: "command",
  },
  {
    title: "Ctrl+L — Navigate or search",
    body: "A temporary overlay for typing URLs or search terms. Appear → type → Enter → gone.",
    keys: ["Ctrl", "L"],
    visual: "navigate",
  },
  {
    title: "Ctrl+Tab — Switch tabs",
    body: "Hold Ctrl and tap Tab to cycle through open tabs. Release Ctrl to land on the highlighted one.",
    keys: ["Ctrl", "Tab"],
    visual: "tabs",
  },
  {
    title: "Ctrl+Shift+N — Quick Note",
    body: "Capture a thought instantly. Type, Ctrl+Enter to save, done — notes link to the page you were on.",
    keys: ["Ctrl", "Shift", "N"],
    visual: "note",
  },
  {
    title: "Ctrl+Shift+F — Focus Mode",
    body: "Start a Pomodoro-style session. A tiny draggable timer floats in the corner while your study site stays fullscreen.",
    keys: ["Ctrl", "Shift", "F"],
    visual: "focus",
  },
] as const;

export function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  const skip = useCallback(() => completeOnboarding(), [completeOnboarding]);
  const next = useCallback(() => {
    setStep((i) => (i < STEPS.length - 1 ? i + 1 : i));
  }, []);
  const back = useCallback(() => setStep((i) => Math.max(0, i - 1)), []);
  const primary = useCallback(() => {
    if (isLast) completeOnboarding();
    else next();
  }, [isLast, completeOnboarding, next]);

  // The onboarding screen owns arrow navigation, Enter and Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        primary();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else if (e.key === "Escape") {
        e.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primary, back, skip]);

  const current = STEPS[step];

  return (
    <div
      className="sb-deepspace sb-stars sb-anim-fade absolute inset-0 z-50 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Lumen"
    >
      {/* Top bar — branding + always-available Skip */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <LumenMark size={20} />
          <p className="text-sm font-medium tracking-tight text-foreground">
            Lumen <span className="font-normal text-muted-foreground">Study Browser</span>
          </p>
        </div>
        <button
          onClick={skip}
          className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
        >
          Skip <span className="ml-1 opacity-60">Esc</span>
        </button>
      </header>

      {/* Fullscreen scene */}
      <main className="relative z-10 min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
          >
            <Visual kind={current.visual} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Copy + controls — anchored bottom, generous whitespace */}
      <footer className="relative z-10 px-8 pb-8">
        <div className="mx-auto max-w-xl text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.14 }}
            >
              {current.keys && (
                <div className="mb-3 flex items-center justify-center gap-1">
                  {current.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </div>
              )}
              <h2 className="text-lg font-medium tracking-tight text-foreground">{current.title}</h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                {current.body}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress line */}
          <div className="mx-auto mt-6 flex h-[3px] w-48 items-stretch gap-1" aria-hidden>
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-200 ${
                  i <= step ? "bg-[oklch(0.82_0.12_84)]" : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {step > 0 && (
              <button
                onClick={back}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:bg-secondary"
              >
                Back
              </button>
            )}
            <button
              onClick={primary}
              autoFocus
              className="rounded-lg bg-[oklch(0.82_0.12_84)] px-5 py-2 text-sm font-medium text-[oklch(0.13_0.004_260)] transition hover:bg-[oklch(0.88_0.10_84)]"
            >
              {isLast ? "Start studying" : "Next"}
            </button>
          </div>

          <p className="mt-4 text-[0.65rem] text-muted-foreground/50">
            Reopen anytime from Settings → Help · <Kbd>→</Kbd> <Kbd>←</Kbd> navigate
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Step visuals — fullscreen mockups of each interaction. Rendered
 * without card borders so they read as scenes, not screenshots.
 * ------------------------------------------------------------------ */
function Visual({ kind }: { kind: string }) {
  if (kind === "fullscreen") {
    return (
      <div className="sb-deepspace absolute inset-0 flex items-center justify-center">
        <div className="relative z-10 w-[72%] max-w-2xl rounded-lg border border-white/10 bg-[oklch(0.13_0.005_260)] shadow-2xl">
          <div className="aspect-video bg-gradient-to-br from-[oklch(0.25_0.05_280)] to-[oklch(0.10_0.005_260)]" />
        </div>
        <p className="absolute bottom-[12%] rounded-full bg-black/60 px-3 py-1 text-[0.7rem] text-white/80 backdrop-blur">
          Fullscreen · no chrome · no distractions
        </p>
      </div>
    );
  }
  if (kind === "command") {
    return (
      <div className="absolute inset-0 flex items-start justify-center pt-[8%]">
        <div className="relative z-10 w-full max-w-lg sb-glass sb-glass-gold rounded-xl p-3 sb-anim-pop">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="sb-text-gold">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="h-3 flex-1 rounded-sm bg-white/5" />
            <Kbd>Esc</Kbd>
          </div>
          {["Start focus · 25 min", "Quick note", "Open Study Library", "Summarize this page"].map((t, i) => (
            <div key={t} className={`flex items-center justify-between px-1 py-1.5 text-xs ${i === 0 ? "rounded bg-[oklch(0.82_0.12_84)]/10 text-white" : "text-white/60"}`}>
              <span>{t}</span>
              <span className="text-white/30">↵</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "navigate") {
    return (
      <div className="absolute inset-0 flex items-start justify-center pt-[12%]">
        <div className="relative z-10 w-full max-w-lg sb-glass sb-glass-gold rounded-xl px-4 py-3 sb-anim-slide-down">
          <div className="flex items-center gap-2 text-xs">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden className="sb-text-gold">
              <path d="M3 12l7-7v4h11v6H10v4l-7-7z" fill="currentColor" />
            </svg>
            <span className="text-white/40">Search or enter URL</span>
          </div>
        </div>
      </div>
    );
  }
  if (kind === "tabs") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="relative z-10 w-full max-w-sm sb-glass rounded-xl p-2 sb-anim-pop">
          {["Thermodynamics — Entropy", "NPTEL — Lecture 4", "Notes — Revision"].map((t, i) => (
            <div key={t} className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${i === 0 ? "bg-[oklch(0.82_0.12_84)]/15 text-white" : "text-white/60"}`}>
              <div className={`h-2 w-2 rounded-full ${i === 0 ? "bg-[oklch(0.82_0.12_84)]" : "bg-white/20"}`} />
              <span>{t}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          <Kbd>Ctrl</Kbd>
          <Kbd>Tab</Kbd>
        </div>
      </div>
    );
  }
  if (kind === "note") {
    return (
      <div className="absolute inset-0 flex items-end justify-end p-[8%]">
        <div className="relative z-10 w-64 sb-glass sb-glass-gold rounded-xl p-3 sb-anim-slide-up">
          <p className="mb-1 text-[0.65rem] uppercase tracking-wider sb-text-gold">Quick note</p>
          <div className="h-12 rounded-sm bg-white/5" />
          <div className="mt-2 flex items-center justify-end gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>↵</Kbd>
            <span className="self-center text-[0.6rem] text-white/40">save</span>
          </div>
        </div>
      </div>
    );
  }
  if (kind === "focus") {
    return (
      <div className="absolute inset-0 flex items-end justify-start p-[8%]">
        <div className="relative z-10 flex items-center gap-2 sb-glass rounded-full px-4 py-2 sb-anim-slide-up">
          <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="9" stroke="oklch(0.82 0.12 84)" strokeWidth="2" fill="none" strokeDasharray="56.5" strokeDashoffset="14" />
          </svg>
          <span className="text-xs tabular-nums text-white">24:13</span>
          <span className="text-[0.65rem] uppercase tracking-wider sb-text-gold">Focus</span>
        </div>
      </div>
    );
  }
  return null;
}
