"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Demo study surface — a self-hosted, embeddable stand-in for a real study
 * website (which would typically block iframe embedding in web preview).
 *
 * Features (richer than a plain video):
 *  - 5 chapters with a working play/pause timer
 *  - Searchable live transcript (type to filter)
 *  - Key concepts sidebar with clickable tags
 *  - Speed control (0.75x / 1x / 1.25x / 1.5x / 2x)
 *  - Slides thumbnail strip (mock)
 *  - Notes scratchpad (local to the surface, not persisted to Lumen Library)
 *
 * In the packaged Electron build, this is bypassed entirely — real study
 * sites (PW / Unacademy / YouTube / LMS) render fullscreen via webContents.
 */

interface TranscriptLine {
  t: number; // seconds
  text: string;
}

const CHAPTERS = [
  {
    title: "Introduction",
    duration: 320,
    keyConcepts: ["system", "surroundings", "state variables"],
    transcript: [
      { t: 0, text: "Welcome. Today we begin our study of the second law of thermodynamics — perhaps the most subtle and far-reaching of all physical laws." },
      { t: 28, text: "Before we get to entropy, let's recall what we mean by a thermodynamic system: the part of the universe we're interested in, separated from its surroundings by a boundary." },
      { t: 65, text: "A system has state variables — pressure, volume, temperature, internal energy. Some are extensive (depend on size), some intensive (don't)." },
      { t: 110, text: "The first law tells us energy is conserved. But it doesn't tell us which processes actually happen. That's the second law's job." },
      { t: 180, text: "Consider a cup of coffee cooling down. Energy is conserved — the heat goes to the room. But the reverse — the coffee spontaneously heating up by drawing heat from the room — never happens, even though it would conserve energy." },
      { t: 260, text: "This asymmetry — some processes are allowed, their reverses are not — is what the second law quantifies. And the quantity that captures it is entropy." },
    ] as TranscriptLine[],
  },
  {
    title: "Foundations",
    duration: 540,
    keyConcepts: ["Clausius", "reversible", "irreversible", "heat engine"],
    transcript: [
      { t: 0, text: "Clausius coined the word 'entropy' from the Greek for 'transformation' — he wanted a name that sounded like 'energy' but signified its directional quality." },
      { t: 45, text: "A reversible process is one that can be run backward without leaving any trace on the universe. Real processes are never quite reversible — there's always friction, turbulence, heat leakage." },
      { t: 120, text: "The Carnot cycle gives us the most efficient possible heat engine: it operates between two reservoirs, and its efficiency depends only on the ratio of temperatures." },
      { t: 220, text: "Clausius showed that for any cyclic process, the integral of dQ/T around the cycle is ≤ 0, with equality only for reversible cycles. This quantity is the change in entropy." },
      { t: 340, text: "For an irreversible process, the total entropy of system plus surroundings strictly increases. That's the modern statement of the second law." },
      { t: 450, text: "So entropy isn't just 'disorder' — it's a measure of how far a process is from being reversible." },
    ] as TranscriptLine[],
  },
  {
    title: "Core concept",
    duration: 720,
    keyConcepts: ["Boltzmann", "microstates", "S = k ln W", "probability"],
    transcript: [
      { t: 0, text: "Boltzmann's grave in Vienna carries his famous formula: S = k log W. Let's unpack what it means." },
      { t: 50, text: "W is the number of microstates — distinct microscopic configurations — consistent with the macroscopic state we observe. A macrostate with more microstates is more probable." },
      { t: 140, text: "Think of two gases separated by a partition. Remove the partition: each molecule could be on either side. The number of configurations grows as 2^N — staggeringly large." },
      { t: 260, text: "The logarithm appears because we want entropy to be extensive — two systems together should have entropy that adds, not multiplies. log(W1 * W2) = log W1 + log W2." },
      { t: 380, text: "k_B is Boltzmann's constant — it converts the dimensionless log W into units of energy per kelvin. It's tiny: 1.38 × 10^-23 J/K." },
      { t: 500, text: "Now: why does entropy always increase? Because there are overwhelmingly more high-entropy macrostates than low-entropy ones. The system isn't 'trying' to do anything — it's just rolling dice, and the high-W macrostate wins almost every time." },
      { t: 620, text: "This is the deep reason the second law is statistical, not absolute. In principle, a gas could spontaneously un-mix. But the probability is so small that the age of the universe isn't enough time to see it happen." },
    ] as TranscriptLine[],
  },
  {
    title: "Worked examples",
    duration: 610,
    keyConcepts: ["isothermal", "adiabatic", "Carnot efficiency"],
    transcript: [
      { t: 0, text: "Let's compute entropy changes for some common processes." },
      { t: 40, text: "Example 1: isothermal expansion of an ideal gas from V1 to V2 at temperature T. Heat absorbed: Q = nRT ln(V2/V1). Entropy change of the gas: ΔS = nR ln(V2/V1). Positive, as expected — the gas has more room, more microstates." },
      { t: 180, text: "Example 2: adiabatic expansion. Q = 0, so ΔS_system = 0. But the gas does work, so its surroundings gain entropy from the work done. Total entropy still increases." },
      { t: 320, text: "Example 3: heat flowing from hot reservoir at T_h to cold reservoir at T_c. Entropy lost by hot: -Q/T_h. Entropy gained by cold: +Q/T_c. Net: Q(1/T_c - 1/T_h) > 0, since T_h > T_c." },
      { t: 460, text: "Carnot efficiency: η = 1 - T_c/T_h. Even a perfect reversible engine can't do better. Real engines always do worse because they generate extra entropy via irreversibility." },
    ] as TranscriptLine[],
  },
  {
    title: "Summary & recap",
    duration: 180,
    keyConcepts: ["arrow of time", "heat death", "local order"],
    transcript: [
      { t: 0, text: "To recap: entropy is the measure of microstate multiplicity. It never decreases in isolated systems — this gives time its arrow." },
      { t: 60, text: "The universe as a whole is heading toward maximum entropy — the so-called heat death, where no useful work is possible. But locally, life and stars create order by exporting entropy to their surroundings." },
      { t: 130, text: "The second law isn't a constraint — it's an explanation. It tells us why ice melts, why heat flows hot to cold, why we remember the past but not the future. Thank you." },
    ] as TranscriptLine[],
  },
];

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function StudySurfacePage() {
  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // seconds
  const [speed, setSpeed] = useState(1);
  const [search, setSearch] = useState("");
  const [rightPanel, setRightPanel] = useState<"concepts" | "slides" | "notes">("concepts");
  const [notes, setNotes] = useState("");
  const [cursorIdx, setCursorIdx] = useState(0); // j/k navigation cursor

  const current = CHAPTERS[chapter];

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + speed;
        if (next >= current.duration) {
          setPlaying(false);
          return current.duration;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [playing, chapter, speed, current.duration]);

  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

  function seekTo(t: number) {
    setProgress(Math.max(0, Math.min(current.duration, t)));
  }

  // j/k keyboard navigation for transcript
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      // Don't interfere with text inputs
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setCursorIdx((i) => Math.min(current.transcript.length - 1, i + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setCursorIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" && (e.target as HTMLElement)?.tagName !== "BUTTON") {
        e.preventDefault();
        const line = current.transcript[cursorIdx];
        if (line) seekTo(line.t);
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, cursorIdx]);

  // Filtered transcript
  const filteredTranscript = useMemo(() => {
    if (!search.trim()) return current.transcript;
    const q = search.toLowerCase();
    return current.transcript.filter((line) => line.text.toLowerCase().includes(q));
  }, [current, search]);

  // Current active line based on progress
  const activeLineIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < current.transcript.length; i++) {
      if (current.transcript[i].t <= progress) idx = i;
      else break;
    }
    return idx;
  }, [progress, current]);

  return (
    <div className="h-screen w-screen bg-[oklch(0.10_0.005_260)] text-[oklch(0.96_0.004_260)] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/5 bg-black/30 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[oklch(0.82_0.12_84)]/15">
            <span className="text-[0.6rem] font-bold sb-text-gold">LU</span>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase tracking-wider text-white/30">Lumen Demo Lecture</p>
            <h1 className="text-sm font-medium text-white/90 leading-tight">Thermodynamics — Entropy & The Second Law</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[0.65rem] text-white/40">
          <span>Prof. A. Rao</span>
          <span className="text-white/20">·</span>
          <span>39 min</span>
          <span className="text-white/20">·</span>
          <span className="rounded-full bg-[oklch(0.82_0.12_84)]/15 px-2 py-0.5 sb-text-gold font-medium">DEMO</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — chapters */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-white/5 bg-black/20 md:flex">
          <div className="border-b border-white/5 px-4 py-3">
            <p className="text-[0.6rem] font-medium uppercase tracking-wider text-white/30">Chapters</p>
          </div>
          <div className="flex-1 overflow-y-auto sb-no-scrollbar">
            {CHAPTERS.map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  setChapter(i);
                  setProgress(0);
                  setPlaying(false);
                  setCursorIdx(0);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                  i === chapter ? "bg-[oklch(0.82_0.12_84)]/10" : "hover:bg-white/5"
                }`}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-bold"
                  style={{
                    background: i === chapter ? "oklch(0.82 0.12 84)" : "rgba(255,255,255,0.06)",
                    color: i === chapter ? "#0a0a0f" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`truncate text-xs ${i === chapter ? "text-white font-medium" : "text-white/60"}`}>
                    {c.title}
                  </p>
                  <p className="text-[0.6rem] text-white/30">{fmt(c.duration)}</p>
                </div>
                {i === chapter && playing && (
                  <div className="flex gap-0.5">
                    <span className="h-1 w-0.5 animate-pulse rounded-full bg-[oklch(0.82_0.12_84)]" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-0.5 animate-pulse rounded-full bg-[oklch(0.82_0.12_84)]" style={{ animationDelay: "150ms" }} />
                    <span className="h-1 w-0.5 animate-pulse rounded-full bg-[oklch(0.82_0.12_84)]" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Main — video + transcript */}
        <main className="flex flex-1 flex-col min-w-0">
          {/* Video */}
          <div className="relative bg-black" style={{ aspectRatio: "16 / 9" }}>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 30% 30%, oklch(0.30 0.05 280), oklch(0.08 0.005 260) 70%)",
              }}
            />
            {/* Speaker glow when playing */}
            {playing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-32 w-32 rounded-full bg-[oklch(0.82_0.12_84)]/10 blur-3xl animate-pulse" />
              </div>
            )}
            {/* Center play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              {!playing ? (
                <button
                  onClick={() => setPlaying(true)}
                  className="group flex h-16 w-16 items-center justify-center rounded-full bg-[oklch(0.82_0.12_84)]/90 text-[oklch(0.13_0.004_260)] transition hover:scale-105 hover:bg-[oklch(0.82_0.12_84)]"
                  aria-label="Play lecture"
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => setPlaying(false)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-md transition hover:bg-black/70"
                  aria-label="Pause"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                  </svg>
                </button>
              )}
            </div>
            {/* Title overlay */}
            <div className="pointer-events-none absolute left-5 top-4">
              <p className="text-[0.6rem] font-medium uppercase tracking-wider text-white/40">
                Chapter {chapter + 1} of {CHAPTERS.length}
              </p>
              <h2 className="mt-0.5 text-lg font-light text-white/90">{current.title}</h2>
            </div>
            {/* Speed badge */}
            <div className="absolute right-4 top-4 rounded-full bg-black/50 px-2.5 py-1 text-[0.6rem] text-white/60 backdrop-blur-md">
              {speed}× speed
            </div>
          </div>

          {/* Player controls */}
          <div className="border-t border-white/5 bg-black/40 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlaying((p) => !p)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <span className="text-[0.7rem] tabular-nums text-white/50 w-10">{fmt(progress)}</span>
              {/* Scrub bar */}
              <div
                className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/10"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  seekTo(ratio * current.duration);
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[oklch(0.82_0.12_84)]"
                  style={{ width: `${(progress / current.duration) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.82_0.12_84)] shadow-lg"
                  style={{ left: `${(progress / current.duration) * 100}%` }}
                />
              </div>
              <span className="text-[0.7rem] tabular-nums text-white/50 w-10 text-right">{fmt(current.duration)}</span>
              {/* Speed control */}
              <div className="ml-2 flex items-center gap-1 rounded-full bg-white/5 p-0.5">
                {SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setSpeed(sp)}
                    className={`rounded-full px-1.5 py-0.5 text-[0.6rem] tabular-nums transition ${
                      speed === sp
                        ? "bg-[oklch(0.82_0.12_84)] text-[oklch(0.13_0.004_260)] font-medium"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    {sp}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transcript — searchable */}
          <div className="flex flex-1 flex-col overflow-hidden border-t border-white/5 bg-black/20">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="sb-text-gold">
                  <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-[0.65rem] font-medium uppercase tracking-wider text-white/40">Live transcript</p>
                <span className="hidden sm:flex items-center gap-1 text-[0.55rem] text-white/30">
                  <kbd className="rounded bg-white/5 px-1 py-0.5 font-mono">j</kbd>
                  <kbd className="rounded bg-white/5 px-1 py-0.5 font-mono">k</kbd>
                  navigate
                  <kbd className="rounded bg-white/5 px-1 py-0.5 font-mono">↵</kbd>
                  seek
                  <kbd className="rounded bg-white/5 px-1 py-0.5 font-mono">␣</kbd>
                  play
                </span>
              </div>
              <div className="relative">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transcript…"
                  className="w-48 rounded-full border border-white/10 bg-black/30 py-1 pl-7 pr-2 text-[0.65rem] text-white placeholder:text-white/30 outline-none focus:border-[oklch(0.82_0.12_84)]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto sb-no-scrollbar p-4 space-y-2">
              {filteredTranscript.length === 0 && (
                <p className="text-center text-xs text-white/30 py-8">No lines match &ldquo;{search}&rdquo;</p>
              )}
              {filteredTranscript.map((line, i) => {
                const origIdx = current.transcript.indexOf(line);
                const isActive = origIdx === activeLineIdx;
                const isPast = origIdx < activeLineIdx;
                const isCursor = origIdx === cursorIdx;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      seekTo(line.t);
                      setCursorIdx(origIdx);
                    }}
                    className={`flex w-full gap-3 rounded-lg px-3 py-2 text-left transition ${
                      isActive
                        ? "bg-[oklch(0.82_0.12_84)]/10 ring-1 ring-[oklch(0.82_0.12_84)]/30"
                        : isCursor
                          ? "bg-white/5 ring-1 ring-white/10"
                          : "hover:bg-white/5"
                    }`}
                  >
                    <span className={`shrink-0 text-[0.65rem] tabular-nums ${isActive ? "sb-text-gold" : isCursor ? "text-white/60" : "text-white/30"}`}>
                      {fmt(line.t)}
                    </span>
                    <p className={`text-sm leading-relaxed ${
                      isActive ? "text-white" : isPast ? "text-white/50" : "text-white/70"
                    }`}>
                      {search ? highlight(line.text, search) : line.text}
                    </p>
                    {isCursor && (
                      <span className="ml-auto shrink-0 self-center rounded bg-white/5 px-1 py-0.5 text-[0.5rem] text-white/40">
                        ↵ seek
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right sidebar — concepts / slides / notes */}
        <aside className="hidden w-72 shrink-0 flex-col border-l border-white/5 bg-black/20 lg:flex">
          {/* Tab switch */}
          <div className="flex border-b border-white/5 p-1.5 gap-1">
            {(["concepts", "slides", "notes"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setRightPanel(p)}
                className={`flex-1 rounded-md px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wider transition ${
                  rightPanel === p
                    ? "bg-[oklch(0.82_0.12_84)]/15 text-white ring-1 ring-[oklch(0.82_0.12_84)]/30"
                    : "text-white/40 hover:bg-white/5"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {rightPanel === "concepts" && (
            <div className="flex-1 overflow-y-auto sb-no-scrollbar p-4">
              <p className="mb-2 text-[0.6rem] font-medium uppercase tracking-wider sb-text-gold">
                Key concepts in this chapter
              </p>
              <div className="flex flex-wrap gap-1.5">
                {current.keyConcepts.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] text-white/70 transition hover:border-[oklch(0.82_0.12_84)]/40 hover:text-white"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[0.6rem] font-medium uppercase tracking-wider text-white/30 mb-1">Formula</p>
                <p className="font-mono text-base text-white/90">S = k<sub>B</sub> ln W</p>
                <p className="mt-1 text-[0.65rem] leading-relaxed text-white/40">
                  Entropy equals Boltzmann's constant times the natural log of the number of microstates.
                </p>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-[0.6rem] font-medium uppercase tracking-wider text-white/30">Quick actions</p>
                <button
                  onClick={() => window.parent?.postMessage({ source: "lumen-study-surface", action: "note", text: `Concepts from ${current.title}: ${current.keyConcepts.join(", ")}` }, window.location.origin)}
                  className="mb-1 flex w-full items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-3 py-1.5 text-left text-[0.7rem] text-white/60 hover:bg-white/5"
                >📝 Note these concepts</button>
                <button
                  onClick={() => window.parent?.postMessage({ source: "lumen-study-surface", action: "ai", text: `Explain the key concepts in "${current.title}": ${current.keyConcepts.join(", ")}` }, window.location.origin)}
                  className="flex w-full items-center gap-2 rounded-md bg-[oklch(0.82_0.12_84)]/10 px-3 py-1.5 text-left text-[0.7rem] sb-text-gold hover:bg-[oklch(0.82_0.12_84)]/20"
                >✨ Explain with AI</button>
              </div>
            </div>
          )}

          {rightPanel === "slides" && (
            <div className="flex-1 overflow-y-auto sb-no-scrollbar p-4">
              <p className="mb-2 text-[0.6rem] font-medium uppercase tracking-wider sb-text-gold">Slides</p>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="aspect-video rounded-md border border-white/5 bg-gradient-to-br from-[oklch(0.20_0.005_260)] to-[oklch(0.10_0.005_260)] p-2 transition hover:border-[oklch(0.82_0.12_84)]/40 cursor-pointer"
                  >
                    <div className="mb-1 h-1.5 w-1/3 rounded-full bg-white/20" />
                    <div className="mb-1 h-1 w-2/3 rounded-full bg-white/10" />
                    <div className="mb-1 h-1 w-1/2 rounded-full bg-white/10" />
                    <p className="mt-2 text-[0.55rem] text-white/30">Slide {n}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[0.6rem] text-white/30">Click a slide to jump (demo)</p>
            </div>
          )}

          {rightPanel === "notes" && (
            <div className="flex flex-1 flex-col overflow-hidden p-3">
              <p className="mb-2 text-[0.6rem] font-medium uppercase tracking-wider sb-text-gold">Scratch notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Jot down thoughts as you watch Chapter ${chapter + 1}…`}
                className="flex-1 resize-none rounded-md border border-white/5 bg-black/20 p-2 text-xs text-white/80 outline-none focus:border-[oklch(0.82_0.12_84)] placeholder:text-white/30"
              />
              <button
                onClick={() => {
                  if (notes.trim()) {
                    window.parent?.postMessage(
                      { source: "lumen-study-surface", action: "note", text: notes.trim(), title: `Chapter ${chapter + 1}: ${current.title}` },
                      window.location.origin
                    );
                    setNotes("");
                  }
                }}
                className="mt-2 rounded-md bg-[oklch(0.82_0.12_84)] py-1.5 text-[0.65rem] font-medium text-[oklch(0.13_0.004_260)] hover:bg-[oklch(0.88_0.10_84)]"
              >
                Save to Lumen Library
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded-sm bg-[oklch(0.82_0.12_84)]/30 text-white">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
