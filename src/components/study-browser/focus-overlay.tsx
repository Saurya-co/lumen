"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { sbToast } from "@/lib/toast";

const POSITION_KEY = "lumen-focus-timer-pos";

type Pos = { x: number; y: number };

function loadPosition(): Pos {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch { /* noop */ }
  return { x: 16, y: 16 }; // bottom-left offsets (from corner)
}

/**
 * FocusOverlay — when Focus Mode is active, a tiny floating timer sits in
 * the corner. The study website remains fullscreen. Esc / Ctrl+Shift+F
 * ends the focus session.
 *
 * Features:
 *  - Circular progress ring + remaining time (mm:ss)
 *  - Pause / resume · End · draggable anywhere (position persists)
 *  - Configurable visibility ("Hide timer") and opacity (Settings → Focus)
 *  - Auto-complete via effect (never during render)
 *  - Wall-clock based — survives window blur and tab suspension
 */
export function FocusOverlay() {
  const s = useStore();
  const [, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedAccum, setPausedAccum] = useState(0);
  // Position: lazy init from persisted storage (falls back to bottom-left).
  // Safe during SSR — loadPosition() catches and returns the default.
  const [pos, setPos] = useState<Pos>(() => loadPosition());
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // "Hide timer — fully out of your way": render nothing while active.
  // Esc / Ctrl+Shift+F remain available to end the session. The 1s tick
  // keeps running so session completion still fires on time.
  const hidden = s.settings.focusMode.hideTimer;

  useEffect(() => {
    if (!s.focusActive) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [s.focusActive]);

  const now = Date.now();
  const effectiveStart = (s.focusStartedAt ?? now) + pausedAccum;
  const elapsedRaw = Math.floor((now - effectiveStart) / 1000);
  const elapsed = paused && pausedAt ? Math.floor((pausedAt - effectiveStart) / 1000) : elapsedRaw;
  const remaining = Math.max(0, s.focusDurationSec - elapsed);
  const ratio = Math.min(1, s.focusDurationSec > 0 ? elapsed / s.focusDurationSec : 1);
  const completed = s.focusActive && s.focusStartedAt != null && remaining === 0;

  // Auto-complete when the timer reaches zero. `completed` flips once per
  // session, so the toast fires exactly once; endFocus runs shortly after
  // so the user sees 0:00 / "Done!" first.
  useEffect(() => {
    if (!completed) return;
    sbToast.info(
      "Focus session complete!",
      `You finished a ${Math.max(1, Math.floor(s.focusDurationSec / 60))}-minute session. Time for a short break.`
    );
    const t = setTimeout(() => useStore.getState().endFocus(true), 1500);
    return () => clearTimeout(t);
  }, [completed, s.focusDurationSec]);

  function togglePause() {
    if (paused) {
      setPausedAccum((a) => a + (Date.now() - (pausedAt ?? Date.now())));
      setPausedAt(null);
      setPaused(false);
      sbToast.info("Focus resumed", "Back to work.");
    } else {
      setPausedAt(Date.now());
      setPaused(true);
      sbToast.info("Focus paused", "Take a breath. Resume when ready.");
    }
  }

  // ---- Drag handling -------------------------------------------------------
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return; // buttons stay clickable
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const maxX = window.innerWidth - 260;
    const maxY = window.innerHeight - 60;
    setPos({
      x: Math.max(8, Math.min(maxX, d.origX + (e.clientX - d.startX))),
      y: Math.max(8, Math.min(maxY, d.origY + (e.clientY - d.startY))),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    setPos((p) => {
      try { localStorage.setItem(POSITION_KEY, JSON.stringify(p)); } catch { /* noop */ }
      return p;
    });
  }, []);

  if (!s.focusActive || !s.focusStartedAt) {
    if (s.breakActive && s.breakStartedAt && !hidden) return <BreakChip />;
    return null;
  }

  if (hidden) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  function ring(ratioValue: number, stroke: string) {
    const C = 2 * Math.PI * 10;
    return (
      <svg className="h-8 w-8 -rotate-90" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" fill="none" />
        <circle
          cx="12" cy="12" r="10"
          stroke={stroke}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${C}`}
          strokeDashoffset={`${C * (1 - ratioValue)}`}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.12 }}
      className="absolute z-30 touch-none select-none"
      style={{
        left: pos.x,
        bottom: pos.y,
        cursor: dragging ? "grabbing" : "grab",
        opacity: Math.min(1, Math.max(0.4, s.settings.focusMode.timerOpacity || 1)),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className={`sb-glass sb-glass-gold flex items-center gap-2.5 rounded-2xl py-1.5 pl-2.5 pr-2 ${
          remaining === 0 ? "sb-anim-glow" : ""
        }`}
      >
        {/* Progress ring */}
        <div className="relative h-8 w-8">
          {ring(ratio, "oklch(0.82 0.12 84)")}
          <div className="absolute inset-0 flex items-center justify-center text-[0.6rem] font-medium tabular-nums sb-text-gold">
            {Math.floor(ratio * 100)}
          </div>
        </div>

        {/* Time + label */}
        <div className="flex min-w-[3.5rem] flex-col">
          <span className={`text-xs font-medium tabular-nums text-foreground ${remaining === 0 ? "sb-text-gold" : ""}`}>
            {remaining === 0 ? "Done!" : `${mins}:${String(secs).padStart(2, "0")}`}
          </span>
          <span className="-mt-0.5 text-[0.55rem] uppercase tracking-wider sb-text-gold">
            {paused ? "Paused" : remaining === 0 ? "Complete" : "Focus"}
          </span>
        </div>

        <PomodoroCycle cycleLength={s.settings.focusMode.cycleLength} />

        {/* Pause / resume */}
        <button
          onClick={togglePause}
          aria-label={paused ? "Resume focus session" : "Pause focus session"}
          title={paused ? "Resume" : "Pause"}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          {paused ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          ) : (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
          )}
        </button>

        {/* End */}
        <button
          onClick={() => s.endFocus(true)}
          aria-label="End focus session"
          title="End focus session"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[oklch(0.82_0.12_84)]/20 text-[oklch(0.82_0.12_84)] transition hover:bg-[oklch(0.82_0.12_84)]/40"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1.5" />
          </svg>
        </button>
      </div>

      {paused && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-[0.55rem] text-white/60 backdrop-blur-md"
        >
          Take a break — resume when ready
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * BreakChip — a calm blue-tinted floating timer shown during a Pomodoro
 * break. Counts down the break duration. End button skips the break.
 */
function BreakChip() {
  const s = useStore();
  const [, setTick] = useState(0);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!s.breakActive) {
      endedRef.current = false;
      return;
    }
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [s.breakActive]);

  useEffect(() => {
    if (!s.breakActive || !s.breakStartedAt) return;
    const elapsed = Math.floor((Date.now() - s.breakStartedAt) / 1000);
    if (elapsed >= s.breakDurationSec && !endedRef.current) {
      endedRef.current = true;
      const t = setTimeout(() => useStore.getState().endBreak(), 1500);
      return () => clearTimeout(t);
    }
  }, [s.breakActive, s.breakStartedAt, s.breakDurationSec, s]);

  if (!s.breakActive || !s.breakStartedAt) return null;

  const elapsed = Math.floor((Date.now() - s.breakStartedAt) / 1000);
  const remaining = Math.max(0, s.breakDurationSec - elapsed);
  const ratio = Math.min(1, s.breakDurationSec > 0 ? elapsed / s.breakDurationSec : 1);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const C = 2 * Math.PI * 10;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-4 left-4 z-30"
    >
      <div className="sb-glass flex items-center gap-2.5 rounded-2xl py-1.5 pl-2.5 pr-2"
        style={{ borderColor: "oklch(0.7 0.12 200 / 0.28)" }}
      >
        <div className="relative h-8 w-8">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" fill="none" />
            <circle
              cx="12" cy="12" r="10"
              stroke="oklch(0.7 0.12 200)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${C}`}
              strokeDashoffset={`${C * (1 - ratio)}`}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm" aria-hidden>☕</div>
        </div>
        <div className="flex min-w-[3.5rem] flex-col">
          <span className="text-xs font-medium tabular-nums text-foreground">
            {remaining === 0 ? "Done!" : `${mins}:${String(secs).padStart(2, "0")}`}
          </span>
          <span className="-mt-0.5 text-[0.55rem] uppercase tracking-wider text-[oklch(0.7_0.12_200)]">
            Break
          </span>
        </div>
        <button
          onClick={() => s.endBreak()}
          aria-label="End break early"
          title="End break early"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[oklch(0.7_0.12_200)]/20 text-[oklch(0.7_0.12_200)] transition hover:bg-[oklch(0.7_0.12_200)]/40"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

/**
 * PomodoroCycle — shows session progress within a Pomodoro cycle as gold dots.
 */
function PomodoroCycle({ cycleLength }: { cycleLength: number }) {
  const s = useStore();

  const completedToday = (() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return s.focusSessions.filter(
      (f) => f.completed && new Date(f.startedAt).toISOString().slice(0, 10) === todayKey
    ).length;
  })();

  const inCycle = completedToday % cycleLength;

  return (
    <div className="flex items-center gap-1" title={`Session ${inCycle + 1} of ${cycleLength}`}>
      {Array.from({ length: cycleLength }, (_, i) => {
        const done = i < inCycle;
        const current = i === inCycle && s.focusActive;
        return (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              done
                ? "bg-[oklch(0.82_0.12_84)]"
                : current
                  ? "bg-[oklch(0.82_0.12_84)]/50 ring-1 ring-[oklch(0.82_0.12_84)]/40"
                  : "bg-white/10"
            }`}
          />
        );
      })}
    </div>
  );
}
