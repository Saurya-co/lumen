"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, type StudyBrowserState } from "@/lib/store";
import { STUDY_PORTALS, SHORTCUTS } from "@/lib/constants";
import type { Settings as SettingsType } from "@/lib/types";
import { TagManager } from "./tag-manager";
import { z } from "zod";

const SettingsSchema = z.object({
  theme: z.enum(["deep-space", "charcoal", "midnight"]).default("deep-space"),
  accentGold: z.boolean().default(true),
  reduceMotion: z.boolean().default(false),
  startupPortal: z.enum(["pw", "unacademy", "nptel", "youtube", "lms", "custom"]).nullable().default(null),
  startupRestoreTabs: z.boolean().default(true),
  focusMode: z.object({
    defaultDurationMin: z.number().int().positive().default(25),
    blockNotifications: z.boolean().default(true),
    hideTimer: z.boolean().default(false),
    timerOpacity: z.number().min(0.4).max(1).default(1),
    autoBreak: z.boolean().default(true),
    breakDurationMin: z.number().int().positive().default(5),
    cycleLength: z.number().int().positive().default(4),
    longBreakEvery: z.number().int().positive().default(4),
    longBreakDurationMin: z.number().int().positive().default(15),
  }).prefault({}),
  tracking: z.object({
    enabled: z.boolean().default(true),
    trackVideoPosition: z.boolean().default(true),
    trackScrollPosition: z.boolean().default(true),
    autoResumePrompt: z.boolean().default(true),
  }).prefault({}),
  ai: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(["zai", "none"]).default("zai"),
    autoSummarize: z.boolean().default(false),
  }).prefault({}),
  browser: z.object({
    blockAdsInStudySites: z.boolean().default(false),
    hardwareAcceleration: z.boolean().default(true),
    sleepBackgroundTabs: z.boolean().default(true),
    pdfViewer: z.enum(["internal", "browser"]).default("internal"),
  }).prefault({}),
  goals: z.object({
    dailyMin: z.number().int().positive().default(60),
    weeklyMin: z.number().int().positive().default(300),
    enabled: z.boolean().default(true),
  }).prefault({}),
  onboardingCompleted: z.boolean().default(false),
});

// Section set mirrors the product spec exactly:
// General · Study · Focus · AI · Library · Shortcuts · Appearance · Browser · Help
type Section =
  | "general" | "study" | "focus" | "ai"
  | "library" | "shortcuts" | "appearance" | "browser" | "help";

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "⚙" },
  { id: "study", label: "Study", icon: "🌐" },
  { id: "focus", label: "Focus", icon: "🎯" },
  { id: "ai", label: "AI", icon: "✨" },
  { id: "library", label: "Library", icon: "📚" },
  { id: "shortcuts", label: "Shortcuts", icon: "⌨" },
  { id: "appearance", label: "Appearance", icon: "🎨" },
  { id: "browser", label: "Browser", icon: "🪟" },
  { id: "help", label: "Help", icon: "❓" },
];

export function SettingsScreen() {
  const s = useStore();
  const [section, setSection] = useState<Section>("general");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sb-deepspace sb-stars sb-anim-fade absolute inset-0 z-50 flex items-center justify-center p-6"
    >
      <div className="absolute inset-0" onClick={() => s.closeOverlay()} />
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 flex h-full max-h-[90vh] w-full max-w-5xl overflow-hidden sb-glass sb-glass-gold rounded-2xl sb-anim-pop"
      >
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-border bg-black/20 p-2">
          <div className="px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wider sb-text-gold">Settings</p>
          </div>
          <nav className="space-y-0.5">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setSection(sec.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition ${
                  section === sec.id
                    ? "bg-[oklch(0.82_0.12_84)]/15 text-foreground ring-1 ring-[oklch(0.82_0.12_84)]/30"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <span className="text-xs">{sec.icon}</span>
                <span>{sec.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-4 border-t border-border px-3 pt-3">
            <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">App</p>
            <p className="mt-1 text-xs font-medium text-foreground">Lumen</p>
            <p className="text-[0.65rem] text-muted-foreground">Study Browser v1.0</p>
          </div>
        </aside>

        {/* Content */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <h2 className="text-base font-medium text-foreground">
              {SECTIONS.find((x) => x.id === section)?.label}
            </h2>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                <span className="sb-kbd">Ctrl</span> <span className="sb-kbd">,</span> toggle
              </span>
              <button onClick={() => s.closeOverlay()} className="sb-kbd" aria-label="Close settings">Esc</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto sb-scroll p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {section === "general" && <GeneralSection />}
                {section === "study" && (
                  <div className="space-y-8">
                    <PortalSection />
                    <WorkspacesSection />
                  </div>
                )}
                {section === "focus" && <FocusSection />}
                {section === "ai" && <AISection />}
                {section === "library" && <LibrarySection />}
                {section === "shortcuts" && <ShortcutsSection />}
                {section === "appearance" && <AppearanceSection />}
                {section === "browser" && <BrowserSection />}
                {section === "help" && <HelpSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {desc && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[oklch(0.82_0.12_84)]" : "bg-secondary"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`}
      />
    </button>
  );
}

function GeneralSection() {
  const s = useStore();
  const set = (patch: Partial<SettingsType>) => s.updateSettings(patch);
  return (
    <div className="max-w-2xl">
      <Row title="Startup behavior" desc="What Lumen shows when it launches.">
        <select
          value={s.settings.startupPortal ?? ""}
          onChange={(e) => set({ startupPortal: (e.target.value || null) as SettingsType["startupPortal"] })}
          className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
        >
          <option value="">Show portal picker</option>
          {STUDY_PORTALS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Row>
      <div className="border-t border-border" />
      <Row title="Restore previous tabs" desc="Reopen tabs from your last session on launch.">
        <Toggle checked={s.settings.startupRestoreTabs} onChange={(v) => set({ startupRestoreTabs: v })} />
      </Row>
      <div className="border-t border-border" />
      <Row title="Study-time tracking" desc="Counts minutes spent studying. Stays local.">
        <Toggle checked={s.settings.tracking.enabled} onChange={(v) => set({ tracking: { ...s.settings.tracking, enabled: v } })} />
      </Row>
      <Row title="Track scroll position" desc="Resume where you left off in long articles.">
        <Toggle checked={s.settings.tracking.trackScrollPosition} onChange={(v) => set({ tracking: { ...s.settings.tracking, trackScrollPosition: v } })} />
      </Row>
      <Row title="Track video position" desc="Resume YouTube/lecture videos at the timestamp you left.">
        <Toggle checked={s.settings.tracking.trackVideoPosition} onChange={(v) => set({ tracking: { ...s.settings.tracking, trackVideoPosition: v } })} />
      </Row>
      <Row title="Auto-resume prompt" desc="Show a small prompt when re-opening a saved lecture.">
        <Toggle checked={s.settings.tracking.autoResumePrompt} onChange={(v) => set({ tracking: { ...s.settings.tracking, autoResumePrompt: v } })} />
      </Row>
      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Stats</p>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total study" value={`${Math.floor(s.studySeconds / 60)} min`} />
          <Stat label="Notes" value={`${s.notes.length}`} />
          <Stat label="Library items" value={`${s.library.length}`} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-light text-foreground">{value}</p>
    </div>
  );
}

function PortalSection() {
  const s = useStore();
  const [customUrl, setCustomUrl] = useState(s.customPortalUrl);
  const [lmsUrl, setLmsUrl] = useState(s.customLmsUrl);
  const [customUrlWarned, setCustomUrlWarned] = useState(false);
  const [lmsUrlWarned, setLmsUrlWarned] = useState(false);

  const knownDomains = STUDY_PORTALS.filter((p) => p.url).map((p) => {
    try {
      return new URL(p.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }).filter(Boolean);

  function validateCustomUrl(url: string, setWarned: (v: boolean) => void, warned: boolean) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, "");
      if (!knownDomains.includes(host) && !warned) {
        const confirmed = window.confirm(
          `This domain (${host}) is not a known study portal.\n\n` +
          `Loading it fullscreen means it will have no browser chrome (no URL bar, no security indicators).\n\n` +
          `Only proceed if you trust this site.`
        );
        if (!confirmed) {
          setCustomUrl("");
          s.setCustomPortalUrl("");
        }
        setWarned(true);
      }
    } catch {
      // Invalid URL, let user continue typing
    }
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-sm text-muted-foreground">
        Your chosen study website becomes the entire screen. Pick one — you can change it any time.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {STUDY_PORTALS.map((p) => (
          <button
            key={p.id}
            onClick={() => s.setPortal(p.id, { customUrl, lmsUrl })}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
              s.chosenPortalId === p.id
                ? "border-[oklch(0.82_0.12_84)] bg-[oklch(0.82_0.12_84)]/10"
                : "border-border bg-secondary/30 hover:bg-secondary/60"
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: p.color }}>
              {p.glyph}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{p.description}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Custom URL</label>
          <input
            value={customUrl}
            onChange={(e) => { setCustomUrl(e.target.value); s.setCustomPortalUrl(e.target.value); }}
            onBlur={(e) => validateCustomUrl(e.target.value, setCustomUrlWarned, customUrlWarned)}
            placeholder="https://your-study-site.com"
            className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">College LMS URL</label>
          <input
            value={lmsUrl}
            onChange={(e) => { setLmsUrl(e.target.value); s.setCustomLmsUrl(e.target.value); }}
            onBlur={(e) => validateCustomUrl(e.target.value, setLmsUrlWarned, lmsUrlWarned)}
            placeholder="https://lms.yourcollege.edu"
            className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
          />
        </div>
      </div>
    </div>
  );
}

function WorkspacesSection() {
  const s = useStore();
  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-sm text-muted-foreground">
        Workspaces group notes, lectures, tabs and bookmarks by subject. Useful for juggling multiple exams.
      </p>
      {s.workspaces.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No workspaces yet.</p>
          <button
            onClick={() => s.setOverlay("library")}
            className="mt-2 rounded-md bg-[oklch(0.82_0.12_84)] px-3 py-1.5 text-xs font-medium text-[oklch(0.13_0.004_260)] hover:bg-[oklch(0.88_0.10_84)]"
          >
            Open Library to create one
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {s.workspaces.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
              <div className="h-3 w-3 rounded-full" style={{ background: w.color }} />
              <p className="flex-1 text-sm text-foreground">{w.name}</p>
              <button
                onClick={() => s.deleteWorkspace(w.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FocusSection() {
  const s = useStore();
  const set = (patch: Partial<SettingsType["focusMode"]>) => s.updateSettings({ focusMode: { ...s.settings.focusMode, ...patch } });
  return (
    <div className="max-w-2xl">
      <Row title="Default duration" desc="Pomodoro-style default for new focus sessions.">
        <select
          value={s.settings.focusMode.defaultDurationMin}
          onChange={(e) => set({ defaultDurationMin: parseInt(e.target.value) })}
          className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
        >
          {[15, 20, 25, 30, 45, 50, 60, 90].map((m) => (
            <option key={m} value={m}>{m} min</option>
          ))}
        </select>
      </Row>
      <div className="border-t border-border" />
      <Row title="Block notifications" desc="In the packaged app, system & site notifications are muted during focus.">
        <Toggle checked={s.settings.focusMode.blockNotifications} onChange={(v) => set({ blockNotifications: v })} />
      </Row>
      <Row title="Hide timer" desc="Don't show the floating focus chip — fully out of your way. Esc or Ctrl+Shift+F still ends the session.">
        <Toggle checked={s.settings.focusMode.hideTimer} onChange={(v) => set({ hideTimer: v })} />
      </Row>
      <Row title="Timer opacity" desc="Keep the floating chip subtle so it never competes with study content.">
        <select
          value={s.settings.focusMode.timerOpacity}
          onChange={(e) => set({ timerOpacity: parseFloat(e.target.value) })}
          disabled={s.settings.focusMode.hideTimer}
          className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)] disabled:opacity-50"
        >
          <option value="1">100%</option>
          <option value="0.85">85%</option>
          <option value="0.7">70%</option>
          <option value="0.55">55%</option>
          <option value="0.4">40%</option>
        </select>
      </Row>
      <div className="border-t border-border" />
      <Row title="Auto-start break" desc="After a completed focus session, automatically start a Pomodoro-style break.">
        <Toggle checked={s.settings.focusMode.autoBreak} onChange={(v) => set({ autoBreak: v })} />
      </Row>
      <Row title="Break duration" desc="How long each auto-started break lasts.">
        <select
          value={s.settings.focusMode.breakDurationMin}
          onChange={(e) => set({ breakDurationMin: parseInt(e.target.value) })}
          className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
        >
          {[3, 5, 10, 15, 20].map((m) => (
            <option key={m} value={m}>{m} min</option>
          ))}
        </select>
      </Row>
      <div className="border-t border-border" />
      <Row title="Long break every" desc="After this many focus sessions, take a longer break (Pomodoro cycle length).">
        <select
          value={s.settings.focusMode.longBreakEvery}
          onChange={(e) => set({ longBreakEvery: parseInt(e.target.value), cycleLength: parseInt(e.target.value) })}
          className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
        >
          {[2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n} sessions</option>
          ))}
        </select>
      </Row>
      <Row title="Long break duration" desc="How long the long break lasts after a full cycle.">
        <select
          value={s.settings.focusMode.longBreakDurationMin}
          onChange={(e) => set({ longBreakDurationMin: parseInt(e.target.value) })}
          className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
        >
          {[10, 15, 20, 25, 30].map((m) => (
            <option key={m} value={m}>{m} min</option>
          ))}
        </select>
      </Row>
      <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent sessions</p>
        {s.focusSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sessions yet. Press Ctrl+Shift+F.</p>
        ) : (
          <div className="space-y-1">
            {s.focusSessions.slice(0, 5).map((f) => (
              <div key={f.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{f.tabTitle ?? "Session"}</span>
                <span className="text-muted-foreground">
                  {new Date(f.startedAt).toLocaleDateString()} · {Math.floor(f.durationSec / 60)} min {f.completed ? "✓" : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AISection() {
  const s = useStore();
  const set = (patch: Partial<SettingsType["ai"]>) => s.updateSettings({ ai: { ...s.settings.ai, ...patch } });
  return (
    <div className="max-w-2xl">
      <div className="mb-4 rounded-lg border border-[oklch(0.82_0.12_84)]/30 bg-[oklch(0.82_0.12_84)]/5 p-4">
        <p className="text-xs text-muted-foreground">
          <span className="sb-text-gold font-medium">AI is optional and secondary.</span>{" "}
          Lumen works fully offline. Enabling AI adds Summarize / Explain / Ask AI actions to the command center
          and selection bubble.
        </p>
      </div>
      <Row title="Enable AI assistant" desc="Power Summarize, Explain, Simplify and Ask AI.">
        <Toggle checked={s.settings.ai.enabled} onChange={(v) => set({ enabled: v })} />
      </Row>
      <div className="border-t border-border" />
      <Row title="Provider" desc="Lumen uses the Z.ai SDK for in-process inference. No data leaves your machine except the prompt itself.">
        <select
          value={s.settings.ai.provider}
          onChange={(e) => set({ provider: e.target.value as SettingsType["ai"]["provider"] })}
          className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
        >
          <option value="zai">Z.ai (default)</option>
          <option value="none">None</option>
        </select>
      </Row>
      <Row title="Auto-summarize lectures" desc="Generate a short summary when you finish a lecture.">
        <Toggle checked={s.settings.ai.autoSummarize} onChange={(v) => set({ autoSummarize: v })} />
      </Row>
      <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Privacy: prompts are sent only when you explicitly invoke an AI action.
        </p>
      </div>
    </div>
  );
}

function LibrarySection() {
  const s = useStore();
  const setGoals = (patch: Partial<SettingsType["goals"]>) => s.updateSettings({ goals: { ...s.settings.goals, ...patch } });
  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-sm text-muted-foreground">
        Your Study Library is fully local — stored in your browser. Nothing syncs to a server.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Notes" value={`${s.notes.length}`} />
        <Stat label="Bookmarks" value={`${s.library.filter((l) => l.kind === "bookmark").length}`} />
        <Stat label="Lectures" value={`${s.library.filter((l) => l.kind === "lecture").length}`} />
        <Stat label="PDFs" value={`${s.library.filter((l) => l.kind === "pdf").length}`} />
      </div>

      {/* Study Goals */}
      <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider sb-text-gold">Study goals</p>
        <Row title="Enable goals" desc="Show daily & weekly progress bars on the Dashboard.">
          <Toggle checked={s.settings.goals.enabled} onChange={(v) => setGoals({ enabled: v })} />
        </Row>
        <div className="border-t border-border" />
        <Row title="Daily target" desc="Minutes of focus per day. Default: 60 min (1 hour).">
          <select
            value={s.settings.goals.dailyMin}
            onChange={(e) => setGoals({ dailyMin: parseInt(e.target.value) })}
            className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
            disabled={!s.settings.goals.enabled}
          >
            {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </Row>
        <Row title="Weekly target" desc="Minutes of focus per week. Default: 300 min (5 hours).">
          <select
            value={s.settings.goals.weeklyMin}
            onChange={(e) => setGoals({ weeklyMin: parseInt(e.target.value) })}
            className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
            disabled={!s.settings.goals.enabled}
          >
            {[120, 180, 240, 300, 420, 600, 900].map((m) => (
              <option key={m} value={m}>{m} min ({Math.floor(m / 60)}h)</option>
            ))}
          </select>
        </Row>
      </div>

      {/* Tag manager */}
      <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider sb-text-gold">Tag manager</p>
        <TagManager />
      </div>

      {/* Export / Import */}
      <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider sb-text-gold">Backup & export</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportData(s)}
            className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
          >
            Export JSON
          </button>
          <button
            onClick={() => exportCsv(s)}
            className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
          >
            Export sessions (CSV)
          </button>
          <button
            onClick={() => exportMarkdown(s)}
            className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
          >
            Export notes (Markdown)
          </button>
          <button
            onClick={() => importData()}
            className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
          >
            Import JSON
          </button>
          <button
            onClick={() => { if (confirm("Clear all local data? This cannot be undone.")) { localStorage.removeItem("study-browser-state"); location.reload(); } }}
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/20"
          >
            Clear all data
          </button>
        </div>
        <p className="mt-2 text-[0.65rem] text-muted-foreground">
          JSON backup includes settings, notes, library, workspaces, and focus sessions. CSV includes focus sessions only (for spreadsheet analysis).
        </p>
      </div>
    </div>
  );
}

function ShortcutsSection() {
  const groups = SHORTCUTS.reduce((acc, sc) => {
    (acc[sc.group] ??= []).push(sc);
    return acc;
  }, {} as Record<string, typeof SHORTCUTS[number][]>);
  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-sm text-muted-foreground">
        Browser-level shortcuts are handled by the Lumen shell. Inside study sites, the site&apos;s own shortcuts still work — Lumen only intercepts its accelerators.
      </p>
      {Object.entries(groups).map(([group, list]) => (
        <div key={group} className="mb-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider sb-text-gold">{group}</p>
          <div className="space-y-0.5">
            {list.map((sc) => (
              <div key={sc.label} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/30">
                <span className="text-sm text-foreground">{sc.label}</span>
                <div className="flex gap-1">
                  {sc.keys.map((k, i) => (
                    <span key={i} className="sb-kbd">{k}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AppearanceSection() {
  const s = useStore();
  const set = (patch: Partial<SettingsType>) => s.updateSettings(patch);
  return (
    <div className="max-w-2xl">
      <Row title="Theme" desc="Deep-space effects appear only in browser-owned UI — never on your study site.">
        <select
          value={s.settings.theme}
          onChange={(e) => set({ theme: e.target.value as SettingsType["theme"] })}
          className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
        >
          <option value="deep-space">Deep Space (default)</option>
          <option value="charcoal">Charcoal</option>
          <option value="midnight">Midnight</option>
        </select>
      </Row>
      <div className="border-t border-border" />
      <Row title="Gold accent" desc="Use the restrained gold accent for highlights. Turn off for a fully neutral UI.">
        <Toggle checked={s.settings.accentGold} onChange={(v) => set({ accentGold: v })} />
      </Row>
      <Row title="Reduce motion" desc="Disable subtle animations and transitions for performance.">
        <Toggle checked={s.settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
      </Row>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          {
            id: "deep-space",
            label: "Deep Space",
            bg: "radial-gradient(ellipse 80% 60% at 20% 10%, oklch(0.78 0.12 84 / 0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 85% 90%, oklch(0.65 0.14 280 / 0.16), transparent 60%), oklch(0.10 0.005 260)",
            stars: true,
          },
          {
            id: "charcoal",
            label: "Charcoal",
            bg: "oklch(0.13 0.005 260)",
            stars: false,
          },
          {
            id: "midnight",
            label: "Midnight",
            bg: "linear-gradient(to bottom, oklch(0.10 0.02 260), oklch(0.08 0.01 240))",
            stars: false,
          },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => set({ theme: t.id as SettingsType["theme"] })}
            className={`group relative overflow-hidden rounded-lg border-2 transition ${
              s.settings.theme === t.id
                ? "border-[oklch(0.82_0.12_84)] shadow-[0_0_0_3px_oklch(0.82_0.12_84/0.15)]"
                : "border-border hover:border-[oklch(0.82_0.12_84)]/40"
            }`}
          >
            {/* Preview window with mock UI */}
            <div className="relative h-24 w-full overflow-hidden" style={{ background: t.bg }}>
              {/* Tiny stars */}
              {t.stars && (
                <>
                  <span className="absolute left-2 top-2 h-0.5 w-0.5 rounded-full bg-white/60" />
                  <span className="absolute left-8 top-4 h-0.5 w-0.5 rounded-full bg-white/40" />
                  <span className="absolute left-14 top-1.5 h-0.5 w-0.5 rounded-full bg-white/50" />
                  <span className="absolute right-6 top-3 h-0.5 w-0.5 rounded-full bg-white/60" />
                  <span className="absolute right-12 top-5 h-0.5 w-0.5 rounded-full bg-[oklch(0.82_0.12_84)]/70" />
                </>
              )}
              {/* Mock glass panel */}
              <div className="absolute inset-x-2 bottom-2 rounded-md border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm">
                <div className="mb-1 h-1 w-1/3 rounded-full bg-[oklch(0.82_0.12_84)]" />
                <div className="h-0.5 w-1/2 rounded-full bg-white/20" />
              </div>
              {/* Selected check */}
              {s.settings.theme === t.id && (
                <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[oklch(0.82_0.12_84)] text-[oklch(0.13_0.004_260)]">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
            <p className="px-2 py-1.5 text-[0.65rem] font-medium text-foreground">{t.label}</p>
          </button>
        ))}
      </div>
      {/* Accent preview swatches */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Accent</p>
        <div className="flex gap-2">
          {[
            { name: "Gold", value: "oklch(0.82 0.12 84)" },
            { name: "Surface 1", value: "oklch(0.21 0.006 260)" },
            { name: "Surface 2", value: "oklch(0.16 0.005 260)" },
            { name: "Background", value: "oklch(0.10 0.005 260)" },
            { name: "Border", value: "oklch(1 0 0 / 0.1)" },
          ].map((c) => (
            <div key={c.name} className="flex-1">
              <div className="h-8 w-full rounded-md border border-border" style={{ background: c.value }} />
              <p className="mt-1 text-[0.55rem] text-muted-foreground">{c.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrowserSection() {
  const s = useStore();
  const set = (patch: Partial<SettingsType["browser"]>) => s.updateSettings({ browser: { ...s.settings.browser, ...patch } });
  return (
    <div className="max-w-2xl">
      <Row title="Block ads in study sites" desc="Cosmetic ad-blocking for known coaching/LMS sites.">
        <Toggle checked={s.settings.browser.blockAdsInStudySites} onChange={(v) => set({ blockAdsInStudySites: v })} />
      </Row>
      <div className="border-t border-border" />
      <Row title="Hardware acceleration" desc="Use GPU for smoother video and lower CPU.">
        <Toggle checked={s.settings.browser.hardwareAcceleration} onChange={(v) => set({ hardwareAcceleration: v })} />
      </Row>
      <Row title="Sleep background tabs" desc="Pause inactive tabs to save RAM/CPU. Active tab never sleeps.">
        <Toggle checked={s.settings.browser.sleepBackgroundTabs} onChange={(v) => set({ sleepBackgroundTabs: v })} />
      </Row>
      <Row title="PDF viewer" desc="Open PDFs in Lumen's internal viewer or the browser default.">
        <select
          value={s.settings.browser.pdfViewer}
          onChange={(e) => set({ pdfViewer: e.target.value as SettingsType["browser"]["pdfViewer"] })}
          className="rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
        >
          <option value="internal">Internal (Lumen)</option>
          <option value="browser">Browser default</option>
        </select>
      </Row>
      <div className="mt-6 rounded-lg border border-dashed border-border p-4">
        <p className="text-xs text-muted-foreground">
          These settings apply in the packaged desktop build. In this live preview they're stored but don't change Chromium behaviour.
        </p>
      </div>
    </div>
  );
}

function HelpSection() {
  const s = useStore();
  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <p className="text-sm text-foreground">Lumen Study Browser</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A lightweight, power-efficient Chromium-based study browser. Your study website is the entire screen.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider sb-text-gold">Onboarding</p>
        <p className="mb-3 text-xs text-muted-foreground">Replay the 6-step interactive tutorial any time.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => s.resetOnboarding()}
            className="rounded-md bg-[oklch(0.82_0.12_84)] px-3 py-1.5 text-xs font-medium text-[oklch(0.13_0.004_260)] hover:bg-[oklch(0.88_0.10_84)]"
          >
            Replay onboarding
          </button>
          <button
            onClick={() => s.setOverlay("shortcuts")}
            className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            View keyboard shortcuts
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider sb-text-gold">Core principle</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="text-foreground">Open → immediately study. Need a tool → keyboard shortcut. Finish → tool disappears.</span>
          <br /><br />
          No dashboard. No sidebar. No browser chrome. Just your study site, fullscreen, with keyboard-first tools that appear on demand and vanish when you're done.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider sb-text-gold">Build the desktop app</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          This is the web shell of Lumen. The full desktop app is packaged with Electron. See <code className="rounded bg-secondary px-1 py-0.5 text-[0.65rem]">electron/README.md</code> in the project root for build instructions to produce a Windows <code className="rounded bg-secondary px-1 py-0.5 text-[0.65rem]">.exe</code>.
        </p>
      </div>
    </div>
  );
}

function exportData(s: StudyBrowserState) {
  const data = {
    settings: s.settings,
    notes: s.notes,
    library: s.library,
    workspaces: s.workspaces,
    focusSessions: s.focusSessions,
    studySeconds: s.studySeconds,
    chosenPortalId: s.chosenPortalId,
    customPortalUrl: s.customPortalUrl,
    customLmsUrl: s.customLmsUrl,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lumen-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(s: StudyBrowserState) {
  const rows = [
    ["id", "startedAt", "endedAt", "durationSec", "durationMin", "completed", "tabTitle", "url", "portalId"],
    ...s.focusSessions.map((f) => [
      f.id,
      new Date(f.startedAt).toISOString(),
      f.endedAt ? new Date(f.endedAt).toISOString() : "",
      String(f.durationSec),
      String(Math.floor(f.durationSec / 60)),
      f.completed ? "true" : "false",
      escapeCsv(f.tabTitle ?? ""),
      escapeCsv(f.url ?? ""),
      f.portalId ?? "",
    ]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lumen-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportMarkdown(s: StudyBrowserState) {
  const lines: string[] = [];
  // Header
  lines.push(`# Lumen Study Notes`);
  lines.push("");
  lines.push(`> Exported from Lumen Study Browser on ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push(`**${s.notes.length} notes** · **${s.library.length} library items** · **${s.focusSessions.length} focus sessions**`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Notes grouped by day
  const byDay = new Map<string, typeof s.notes>();
  for (const n of s.notes) {
    const key = new Date(n.createdAt).toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(n);
  }
  const sortedDays = Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  for (const [day, dayNotes] of sortedDays) {
    const date = new Date(day + "T00:00:00");
    lines.push(`## ${date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
    lines.push("");
    for (const n of dayNotes.sort((a, b) => b.createdAt - a.createdAt)) {
      const time = new Date(n.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      // YAML-like frontmatter for each note
      lines.push(`### ${time}`);
      lines.push("");
      if (n.tabTitle) lines.push(`*Source:* ${n.tabTitle}`);
      if (n.url) lines.push(`*URL:* ${n.url}`);
      if (n.tags && n.tags.length > 0) lines.push(`*Tags:* ${n.tags.join(", ")}`);
      lines.push("");
      lines.push(n.text);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  const md = lines.join("\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lumen-notes-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    // SECURITY: Limit file size to 10MB to prevent abuse
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Maximum 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        if (!raw || typeof raw !== "object") {
          alert("Invalid file: not a JSON object.");
          return;
        }

        // SECURITY: Validate the structure of imported data before merging.
        // Only allow known fields with type-checked values. This prevents
        // a malicious JSON file from injecting arbitrary store properties.
        const data = {
          notes: Array.isArray(raw.notes) ? raw.notes.filter(isValidNote) : [],
          library: Array.isArray(raw.library) ? raw.library.filter(isValidLibraryItem) : [],
          workspaces: Array.isArray(raw.workspaces) ? raw.workspaces.filter(isValidWorkspace) : [],
          focusSessions: Array.isArray(raw.focusSessions) ? raw.focusSessions.filter(isValidFocusSession) : [],
          highlights: Array.isArray(raw.highlights) ? raw.highlights.filter(isValidHighlight) : [],
          studySeconds: typeof raw.studySeconds === "number" ? Math.min(raw.studySeconds, 1e9) : 0,
          settings: undefined as SettingsType | undefined,
        };

        // Validate settings object with Zod schema
        if (raw.settings && typeof raw.settings === "object") {
          const validated = SettingsSchema.safeParse(raw.settings);
          if (validated.success) {
            data.settings = validated.data;
          } else {
            console.warn("[Import] Invalid settings object, using defaults:", validated.error.flatten());
          }
        }

        // Merge into the persisted store via localStorage + reload
        const current = JSON.parse(localStorage.getItem("study-browser-state") ?? "{}");
        const merged = {
          ...current,
          state: {
            ...(current.state ?? {}),
            ...data,
            settings: { ...(current.state?.settings ?? {}), ...data.settings },
          },
        };
        localStorage.setItem("study-browser-state", JSON.stringify(merged));
        location.reload();
      } catch (err) {
        alert("Import failed: " + (err instanceof Error ? err.message : "invalid file"));
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Type guards for imported data validation
function isString(v: unknown, max = 10000): v is string {
  return typeof v === "string" && v.length <= max;
}
function isNumber(v: unknown): v is number {
  return typeof v === "number" && isFinite(v) && v >= 0 && v < 1e15;
}
function isStrArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string") && v.length <= 50;
}

function isValidNote(n: unknown): boolean {
  if (!n || typeof n !== "object") return false;
  const o = n as Record<string, unknown>;
  return isString(o.id, 100) && isString(o.text) && isNumber(o.createdAt);
}
function isValidLibraryItem(l: unknown): boolean {
  if (!l || typeof l !== "object") return false;
  const o = l as Record<string, unknown>;
  return isString(o.id, 100) && isString(o.title, 500) && isNumber(o.createdAt) && isNumber(o.updatedAt);
}
function isValidWorkspace(w: unknown): boolean {
  if (!w || typeof w !== "object") return false;
  const o = w as Record<string, unknown>;
  return isString(o.id, 100) && isString(o.name, 200) && isNumber(o.createdAt);
}
function isValidFocusSession(f: unknown): boolean {
  if (!f || typeof f !== "object") return false;
  const o = f as Record<string, unknown>;
  return isString(o.id, 100) && isNumber(o.startedAt) && isNumber(o.durationSec);
}
function isValidHighlight(h: unknown): boolean {
  if (!h || typeof h !== "object") return false;
  const o = h as Record<string, unknown>;
  return isString(o.id, 100) && isString(o.pdfUrl, 8192) && isString(o.text) && isNumber(o.createdAt);
}
