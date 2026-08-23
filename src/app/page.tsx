"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { WebsiteView } from "@/components/study-browser/website-view";
import { PortalPicker } from "@/components/study-browser/portal-picker";
import { Onboarding } from "@/components/study-browser/onboarding";
import { CommandCenter } from "@/components/study-browser/command-center";
import { NavigateOverlay } from "@/components/study-browser/navigate-overlay";
import { TabSwitcher } from "@/components/study-browser/tab-switcher";
import { QuickNote } from "@/components/study-browser/quick-note";
import { FocusOverlay } from "@/components/study-browser/focus-overlay";
import { FindOverlay } from "@/components/study-browser/find-overlay";
import { SelectionBubble } from "@/components/study-browser/selection-bubble";
import { NativeBridge } from "@/lib/native-bridge";
import { ShortcutsOverlay } from "@/components/study-browser/shortcuts-overlay";
import { PdfViewerBridge } from "@/components/study-browser/pdf-viewer-bridge";
import { ResumePrompt } from "@/components/study-browser/resume-prompt";
import { WhatsNewChip } from "@/components/study-browser/whats-new-chip";
import { FocusPresets } from "@/components/study-browser/focus-presets";
import { WeeklyReview } from "@/components/study-browser/weekly-review";

// PERF: heavyweight, rarely-first-used overlays are code-split. The shell
// (Ctrl+K / Ctrl+L / tab switcher — the INSTANT paths) stays in the main
// bundle; Library (recharts), Settings (zod) and AI load on demand and are
// pre-warmed during idle time below so the first open has no visible delay.
const Library = dynamic(
  () => import("@/components/study-browser/library").then((m) => m.Library),
  { ssr: false }
);
const SettingsScreen = dynamic(
  () => import("@/components/study-browser/settings-screen").then((m) => m.SettingsScreen),
  { ssr: false }
);
const AIOverlay = dynamic(
  () => import("@/components/study-browser/ai-overlay").then((m) => m.AIOverlay),
  { ssr: false }
);

export default function Home() {
  useKeyboardShortcuts();

  // Bootstrap on mount + study-time session tracking
  useEffect(() => {
    useStore.getState().bootstrap();
    useStore.getState().startStudySession();
    return () => useStore.getState().endStudySession();
  }, []);

  // Warm the code-split overlay chunks once the browser is idle
  useEffect(() => {
    const warm = () => {
      void import("@/components/study-browser/library");
      void import("@/components/study-browser/settings-screen");
      void import("@/components/study-browser/ai-overlay");
    };
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(warm, { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(warm, 2500);
    return () => window.clearTimeout(t);
  }, []);

  // PERF: narrow selectors — the root re-renders only when the overlay
  // kind, focus session, or motion preference changes. Typing in notes,
  // ticking timers, or library edits no longer re-render the whole tree.
  const overlay = useStore((s) => s.overlay);
  const overlayAction = useStore((s) =>
    s.overlay === "ai" ? (s.overlayData?.action === "ai" ? "ask" : s.overlayData?.action ?? "ask") : null
  );
  const overlayText = useStore((s) => (s.overlay === "ai" ? s.overlayData?.text ?? "" : ""));
  const focusStartedAt = useStore((s) => s.focusStartedAt);
  const reduceMotion = useStore((s) => s.settings.reduceMotion);
  const closeOverlay = useStore((s) => s.closeOverlay);

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden bg-background sb-no-select ${
        reduceMotion ? "sb-reduced-motion" : ""
      }`}
    >
      {/* The study website fills the entire window */}
      <WebsiteView />

      {/* ============================================================
       * LAYER 0 — Browser surface: the user's study website fills the
       * entire window. In Electron it is backed by the native
       * WebContentsView; WebsiteView renders internal routes and the
       * web-preview iframe/fallback only.
       * ============================================================ */}
      {/* Invisible bridges — render nothing */}
      <NativeBridge />
      <PdfViewerBridge />
      <WeeklyReview />

      {/* ============================================================
       * LAYER 1 — Temporary floating tools (auto-dismiss, never panels)
       * ============================================================ */}
      <SelectionBubble />
      {/* Focus timer floats whenever focus is active, regardless of overlay.
          Keyed by session start so each session gets fresh pause state. */}
      <FocusOverlay key={focusStartedAt ?? "idle"} />
      <ResumePrompt />
      {!overlay && <WhatsNewChip />}

      {/* ============================================================
       * LAYER 2 — Temporary overlays. Exactly ONE exists at a time,
       * driven by the single `s.overlay` state (mutually exclusive —
       * opening one replaces any other). Each mounts only while active,
       * is absolutely positioned above Layer 0, and unmounts on
       * Escape / action / backdrop click. They never resize or reflow
       * the browser surface.
       * ============================================================ */}
      {overlay === "portal-picker" && <PortalPicker />}
      {overlay === "onboarding" && <Onboarding />}
      {overlay === "command-center" && <CommandCenter />}
      {overlay === "navigate" && <NavigateOverlay />}
      {overlay === "tab-switcher" && <TabSwitcher />}
      {overlay === "quick-note" && <QuickNote />}
      {overlay === "library" && <Library />}
      {overlay === "settings" && <SettingsScreen />}
      {overlay === "find" && <FindOverlay />}
      {overlay === "ai" && (
        <AIOverlay
          initialAction={overlayAction ?? "ask"}
          initialText={overlayText}
        />
      )}
      {overlay === "shortcuts" && <ShortcutsOverlay />}
      {overlay === "focus-presets" && (
        <FocusPresets
          onSelect={closeOverlay}
          onClose={closeOverlay}
        />
      )}

      {/* LAYER 3 — Critical modals (destructive confirms etc.) render
          inside their owning overlay when required. */}
    </div>
  );
}
