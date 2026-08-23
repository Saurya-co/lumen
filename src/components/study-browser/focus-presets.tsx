"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

/**
 * FocusPresets — a small floating panel shown when the user selects
 * "Start focus session with preset" from the Command Center. Offers
 * quick-start presets for common study scenarios.
 *
 * Presets:
 *  - Quick: 15 min, no break (for review / short tasks)
 *  - Standard: 25 min, 5 min break (classic Pomodoro)
 *  - Deep work: 50 min, 10 min break (long focus blocks)
 *  - Exam prep: 90 min, 20 min break (marathon sessions)
 *
 * Clicking a preset immediately starts the focus session with the
 * chosen duration (and sets the break duration for afterwards).
 */

interface Preset {
  id: string;
  name: string;
  durationMin: number;
  breakMin: number;
  icon: string;
  desc: string;
  color: string;
}

const PRESETS: Preset[] = [
  {
    id: "quick",
    name: "Quick",
    durationMin: 15,
    breakMin: 3,
    icon: "⚡",
    desc: "Short review or a single problem",
    color: "oklch(0.7 0.12 200)",
  },
  {
    id: "standard",
    name: "Standard",
    durationMin: 25,
    breakMin: 5,
    icon: "🍅",
    desc: "Classic Pomodoro technique",
    color: "oklch(0.82 0.12 84)",
  },
  {
    id: "deep",
    name: "Deep work",
    durationMin: 50,
    breakMin: 10,
    icon: "🧠",
    desc: "Long focus blocks for hard problems",
    color: "oklch(0.65 0.18 40)",
  },
  {
    id: "exam",
    name: "Exam prep",
    durationMin: 90,
    breakMin: 20,
    icon: "📚",
    desc: "Marathon sessions for exam season",
    color: "oklch(0.6 0.14 300)",
  },
];

export function FocusPresets({ onSelect, onClose }: { onSelect: (preset: Preset) => void; onClose: () => void }) {
  const s = useStore();

  function choose(preset: Preset) {
    // Update settings to match the preset's break duration
    s.updateSettings({
      focusMode: {
        ...s.settings.focusMode,
        defaultDurationMin: preset.durationMin,
        breakDurationMin: preset.breakMin,
      },
    });
    // Start the focus session with the preset duration
    s.startFocus(preset.durationMin * 60);
    onSelect(preset);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sb-deepspace sb-stars sb-anim-fade absolute inset-0 z-50 flex items-center justify-center p-6"
      >
        <div className="absolute inset-0" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-lg sb-glass sb-glass-gold rounded-2xl overflow-hidden sb-anim-pop"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <div>
                <p className="text-sm font-medium text-foreground">Focus preset</p>
                <p className="text-[0.6rem] text-muted-foreground">Choose a study session template</p>
              </div>
            </div>
            <button onClick={onClose} className="sb-kbd">Esc</button>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
            {PRESETS.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => choose(p)}
                className="group flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-left transition hover:bg-secondary/60"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                  style={{ background: `${p.color}20` }}
                >
                  {p.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-[0.65rem] text-muted-foreground">{p.desc}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[0.6rem]">
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-foreground/70">
                      {p.durationMin} min focus
                    </span>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-muted-foreground">
                      {p.breakMin} min break
                    </span>
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="mt-1 text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 text-center text-[0.6rem] text-muted-foreground">
            Preset updates your default focus + break duration. You can fine-tune in Settings → Focus.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export type { Preset };
