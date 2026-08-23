import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BrowserTab, OverlayKind, Settings, QuickNote, LibraryItem, Workspace, FocusSession, RecentCommand, SelectionBubbleData, StudyPortalId, PdfHighlight } from "./types";
import { DEFAULT_SETTINGS, PORTAL_MAP } from "./constants";
import { sbToast } from "./toast";

function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface StudyBrowserState {
  // bootstrap
  bootstrapped: boolean;
  // portal
  chosenPortalId: StudyPortalId | null;
  customPortalUrl: string;
  customLmsUrl: string;
  // tabs
  tabs: BrowserTab[];
  activeTabId: string | null;
  closedTabs: BrowserTab[];
  // overlays
  overlay: OverlayKind;
  overlayData: SelectionBubbleData | null;
  // focus mode
  focusActive: boolean;
  focusStartedAt: number | null;
  focusDurationSec: number;
  // pomodoro break
  breakActive: boolean;
  breakStartedAt: number | null;
  breakDurationSec: number;
  // pause all background tabs
  tabsPaused: boolean;
  // study-time tracking
  studySeconds: number; // total accumulated
  sessionStart: number | null;
  // data
  notes: QuickNote[];
  library: LibraryItem[];
  workspaces: Workspace[];
  focusSessions: FocusSession[];
  recentCommands: RecentCommand[];
  highlights: PdfHighlight[];
  // settings
  settings: Settings;
  // history (per-tab stacks)
  historyBack: Record<string, string[]>;
  historyForward: Record<string, string[]>;
  // reload counter — bump to force iframe reload
  reloadToken: number;
  // find overlay
  findQuery: string;
  // quick-note draft — survives accidental Esc / click-away within a
  // session so notes are never lost, but is deliberately NOT persisted.
  noteDraftText: string;
  noteDraftTags: string;
  // tab switcher: monotonically increasing tick + direction of last cycle.
  // The switcher previews a selection locally and commits on Ctrl release.
  tabSwitchTick: number;
  tabSwitchDir: 1 | -1;
  // True when the switcher was opened via Ctrl+Tab (commit on Ctrl release).
  tabSwitchViaKeyboard: boolean;
  // Bumped when the native shell reports Ctrl release (Electron flow, where
  // keyup events never reach the renderer). The switcher listens and commits.
  tabSwitchCommitTick: number;

  // actions
  bootstrap: () => void;
  setPortal: (id: StudyPortalId, opts?: { customUrl?: string; lmsUrl?: string }) => void;
  setCustomPortalUrl: (url: string) => void;
  setCustomLmsUrl: (url: string) => void;

  newTab: (url?: string, title?: string, portalId?: StudyPortalId) => string;
  closeTab: (id: string) => void;
  activateTab: (id: string) => void;
  reopenClosedTab: () => void;
  switchTab: (dir: 1 | -1) => void;
  bumpTabSwitcher: (dir: 1 | -1) => void;
  openTabSwitcher: (viaKeyboard: boolean) => void;
  commitTabSwitcher: () => void;
  setTabUrl: (id: string, url: string, title?: string) => void;
  updateTab: (id: string, patch: Partial<BrowserTab>) => void;
  reloadTab: (id?: string) => void;

  goBack: () => void;
  goForward: () => void;

  setOverlay: (overlay: OverlayKind, data?: SelectionBubbleData | null) => void;
  closeOverlay: () => void;

  startFocus: (durationSec?: number) => void;
  endFocus: (completed: boolean) => void;
  startBreak: (durationSec?: number) => void;
  endBreak: () => void;
  toggleTabsPaused: () => void;

  startStudySession: () => void;
  endStudySession: () => void;
  addStudySeconds: (sec: number) => void;

  addNote: (text: string, meta?: Partial<QuickNote>) => void;
  deleteNote: (id: string) => void;
  pinNote: (id: string, pinned: boolean) => void;
  updateNoteTags: (id: string, tags: string[]) => void;

  addToLibrary: (item: Omit<LibraryItem, "id" | "createdAt" | "updatedAt">) => void;
  removeFromLibrary: (id: string) => void;
  visitLibraryItem: (id: string) => void;
  addHighlight: (pdfUrl: string, text: string, note?: string) => void;
  removeHighlight: (id: string) => void;

  addWorkspace: (name: string, color?: string, portalId?: StudyPortalId) => string;
  deleteWorkspace: (id: string) => void;

  recordCommand: (id: string, label: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  resetOnboarding: () => void;
  completeOnboarding: () => void;
  setNoteDraft: (text: string, tags: string) => void;
}

function makeTab(url = "", title = "New Tab"): BrowserTab {
  return {
    id: uid("tab"),
    title,
    url,
    createdAt: Date.now(),
    lastAccessed: Date.now(),
  };
}

// Single shared initial tab so activeTabId matches tabs[0].id
const INITIAL_TAB = makeTab();

/** Exact shape persisted to localStorage — also the contract for migrate(). */
const selectPersisted = (s: StudyBrowserState) => ({
  chosenPortalId: s.chosenPortalId,
  customPortalUrl: s.customPortalUrl,
  customLmsUrl: s.customLmsUrl,
  tabs: s.tabs,
  activeTabId: s.activeTabId,
  closedTabs: s.closedTabs,
  notes: s.notes,
  library: s.library,
  workspaces: s.workspaces,
  focusSessions: s.focusSessions,
  recentCommands: s.recentCommands,
  highlights: s.highlights,
  studySeconds: s.studySeconds,
  settings: s.settings,
  historyBack: s.historyBack,
  historyForward: s.historyForward,
});
type PersistedLumenState = ReturnType<typeof selectPersisted>;

export const useStore = create<StudyBrowserState>()(
  persist(
    (set, get) => ({
      bootstrapped: false,
      chosenPortalId: null,
      customPortalUrl: "",
      customLmsUrl: "",

      tabs: [INITIAL_TAB],
      activeTabId: INITIAL_TAB.id,
      closedTabs: [],

      overlay: null,
      overlayData: null,

      focusActive: false,
      focusStartedAt: null,
      focusDurationSec: 25 * 60,

      // Pomodoro break
      breakActive: false,
      breakStartedAt: null,
      breakDurationSec: 5 * 60,

      // Pause all background tabs (focus mode for tabs)
      tabsPaused: false,

      studySeconds: 0,
      sessionStart: null,

      notes: [],
      library: [],
      workspaces: [],
      focusSessions: [],
      recentCommands: [],
      highlights: [],

      settings: DEFAULT_SETTINGS,

      historyBack: {},
      historyForward: {},
      reloadToken: 0,
      findQuery: "",
      noteDraftText: "",
      noteDraftTags: "",
      tabSwitchTick: 0,
      tabSwitchDir: 1,
      tabSwitchViaKeyboard: false,
      tabSwitchCommitTick: 0,

      bootstrap: () => {
        const s = get();
        if (s.bootstrapped) return;
        // ensure at least one tab exists with the right state
        if (s.tabs.length === 0) {
          const fresh = makeTab();
          set({ tabs: [fresh], activeTabId: fresh.id });
        }
        // also reconcile if activeTabId points to a missing tab
        if (!s.tabs.find((t) => t.id === s.activeTabId)) {
          set({ activeTabId: s.tabs[0]?.id ?? null });
        }
        set({ bootstrapped: true });
        // if no portal chosen, show portal picker overlay
        if (!s.chosenPortalId && !s.settings.onboardingCompleted) {
          set({ overlay: "portal-picker" });
        } else if (!s.settings.onboardingCompleted) {
          set({ overlay: "onboarding" });
        }
      },

      setPortal: (id, opts) => {
        const portal = PORTAL_MAP[id];
        let url = portal.url;
        if (id === "custom" && opts?.customUrl) {
          url = opts.customUrl;
          set({ customPortalUrl: opts.customUrl });
        }
        if (id === "lms" && opts?.lmsUrl) {
          url = opts.lmsUrl;
          set({ customLmsUrl: opts.lmsUrl });
        }
        // load portal into the active tab
        const tabId = get().activeTabId ?? get().tabs[0]?.id;
        if (tabId) {
          get().setTabUrl(tabId, url || "", portal.name);
          get().updateTab(tabId, { portalId: id });
        }
        set({ chosenPortalId: id });
        // move on to onboarding if not done
        if (!get().settings.onboardingCompleted) {
          set({ overlay: "onboarding" });
        } else {
          set({ overlay: null });
        }
      },

      setCustomPortalUrl: (url) => set({ customPortalUrl: url }),
      setCustomLmsUrl: (url) => set({ customLmsUrl: url }),

      newTab: (url, title, portalId) => {
        const tab: BrowserTab = {
          id: uid("tab"),
          url: url ?? "",
          title: title ?? (url ? hostnameOf(url) : "New Tab"),
          portalId,
          createdAt: Date.now(),
          lastAccessed: Date.now(),
        };
        set((s) => ({
          tabs: [...s.tabs.map((t) => ({ ...t, lastAccessed: Date.now() })), tab],
          activeTabId: tab.id,
          overlay: null,
        }));
        if (url) sbToast.tabOpened(tab.title);
        return tab.id;
      },

      closeTab: (id) => {
        const s = get();
        const idx = s.tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;
        const closed = s.tabs[idx];
        const remaining = s.tabs.filter((t) => t.id !== id);
        let nextActive = s.activeTabId;
        if (s.activeTabId === id) {
          nextActive = remaining[Math.min(idx, remaining.length - 1)]?.id ?? null;
        }
        // always keep at least one tab
        if (remaining.length === 0) {
          const fresh = makeTab();
          set({
            tabs: [fresh],
            activeTabId: fresh.id,
            closedTabs: [closed, ...s.closedTabs].slice(0, 20),
          });
          sbToast.tabClosed(closed.title || "New Tab");
          return;
        }
        set({
          tabs: remaining,
          activeTabId: nextActive,
          closedTabs: [closed, ...s.closedTabs].slice(0, 20),
        });
        sbToast.tabClosed(closed.title || "New Tab");
      },

      activateTab: (id) =>
        set((s) => ({
          activeTabId: id,
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, lastAccessed: Date.now() } : t)),
        })),

      reopenClosedTab: () => {
        const s = get();
        if (s.closedTabs.length === 0) return;
        const [restored, ...rest] = s.closedTabs;
        set({
          tabs: [...s.tabs, restored],
          activeTabId: restored.id,
          closedTabs: rest,
        });
      },

      switchTab: (dir) => {
        const s = get();
        if (s.tabs.length < 2) return;
        const idx = s.tabs.findIndex((t) => t.id === s.activeTabId);
        const next = (idx + dir + s.tabs.length) % s.tabs.length;
        set({
          activeTabId: s.tabs[next].id,
          tabs: s.tabs.map((t) => (t.id === s.tabs[next].id ? { ...t, lastAccessed: Date.now() } : t)),
        });
      },

      // Preview-cycle for the Ctrl+Tab switcher: moves the highlighted row
      // without committing. The switcher commits on Ctrl release / Enter.
      bumpTabSwitcher: (dir) =>
        set((s) => ({ tabSwitchTick: s.tabSwitchTick + 1, tabSwitchDir: dir })),

      openTabSwitcher: (viaKeyboard) =>
        set({ overlay: "tab-switcher", tabSwitchViaKeyboard: viaKeyboard, tabSwitchTick: 0 }),

      // Native Ctrl+Tab flow: the study webContents never delivers keyup to
      // the renderer, so the main process sends a release signal over IPC
      // and the switcher commits the previewed tab.
      commitTabSwitcher: () =>
        set((s) => ({ tabSwitchCommitTick: s.tabSwitchCommitTick + 1 })),

      setTabUrl: (id, url, title) =>
        set((s) => {
          const back = s.historyBack[id] ?? [];
          const tab = s.tabs.find((t) => t.id === id);
          if (!tab) return {};
          // Detect portal from URL so context-aware actions stay accurate
          // even when the user navigates via Ctrl+L to a portal's site.
          let detectedPortal: StudyPortalId | undefined = undefined;
          for (const p of Object.values(PORTAL_MAP)) {
            if (p.url && url.includes(new URL(p.url).hostname.replace(/^www\./, ""))) {
              detectedPortal = p.id;
              break;
            }
          }
          return {
            tabs: s.tabs.map((t) =>
              t.id === id
                ? {
                    ...t,
                    url,
                    title: title ?? t.title,
                    lastAccessed: Date.now(),
                    // Reset portalId unless the new URL matches a known portal
                    portalId: detectedPortal ?? (url.startsWith("/study-surface") || url.startsWith("/pdf-viewer") ? t.portalId : undefined),
                  }
                : t
            ),
            historyBack: { ...s.historyBack, [id]: [...back, tab.url].slice(-50) },
            historyForward: { ...s.historyForward, [id]: [] },
          };
        }),

      updateTab: (id, patch) =>
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      reloadTab: (id) => {
        set((s) => ({
          reloadToken: s.reloadToken + 1,
          activeTabId: id ?? s.activeTabId,
        }));
        sbToast.reloaded();
      },

      goBack: () => {
        const s = get();
        const id = s.activeTabId;
        if (!id) return;
        const back = s.historyBack[id] ?? [];
        if (back.length === 0) return;
        const prev = back[back.length - 1];
        const fwd = s.historyForward[id] ?? [];
        const tab = s.tabs.find((t) => t.id === id);
        if (!tab) return;
        set({
          historyBack: { ...s.historyBack, [id]: back.slice(0, -1) },
          historyForward: { ...s.historyForward, [id]: [...fwd, tab.url] },
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, url: prev } : t)),
        });
      },

      goForward: () => {
        const s = get();
        const id = s.activeTabId;
        if (!id) return;
        const fwd = s.historyForward[id] ?? [];
        if (fwd.length === 0) return;
        const next = fwd[fwd.length - 1];
        const back = s.historyBack[id] ?? [];
        const tab = s.tabs.find((t) => t.id === id);
        if (!tab) return;
        set({
          historyForward: { ...s.historyForward, [id]: fwd.slice(0, -1) },
          historyBack: { ...s.historyBack, [id]: [...back, tab.url] },
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, url: next } : t)),
        });
      },

      setOverlay: (overlay, data) => set({ overlay, overlayData: data ?? null }),
      closeOverlay: () => set({ overlay: null, overlayData: null }),

      startFocus: (durationSec) => {
        const dur = durationSec ?? get().settings.focusMode.defaultDurationMin * 60;
        set({
          focusActive: true,
          focusStartedAt: Date.now(),
          focusDurationSec: dur,
          overlay: null,
        });
        sbToast.focusStarted(Math.floor(dur / 60));
      },

      endFocus: (completed) => {
        const s = get();
        if (!s.focusActive || !s.focusStartedAt) {
          set({ focusActive: false, focusStartedAt: null });
          return;
        }
        const elapsed = Math.floor((Date.now() - s.focusStartedAt) / 1000);
        const session: FocusSession = {
          id: uid("fs"),
          startedAt: s.focusStartedAt,
          endedAt: Date.now(),
          durationSec: elapsed,
          tabTitle: s.tabs.find((t) => t.id === s.activeTabId)?.title,
          url: s.tabs.find((t) => t.id === s.activeTabId)?.url,
          portalId: s.tabs.find((t) => t.id === s.activeTabId)?.portalId,
          completed,
        };
        set({
          focusActive: false,
          focusStartedAt: null,
          focusSessions: [session, ...s.focusSessions].slice(0, 200),
          studySeconds: s.studySeconds + elapsed,
        });
        sbToast.focusEnded(completed, Math.floor(elapsed / 60));
        // Auto-start break if the session completed and autoBreak is enabled.
        // After every `longBreakEvery` completed sessions today, use a long break.
        if (completed && s.settings.focusMode.autoBreak) {
          setTimeout(() => {
            const todayKey = new Date().toISOString().slice(0, 10);
            const completedToday = get().focusSessions.filter(
              (f) => f.completed && new Date(f.startedAt).toISOString().slice(0, 10) === todayKey
            ).length;
            const cycleLen = s.settings.focusMode.longBreakEvery;
            const isLongBreak = completedToday % cycleLen === 0;
            const dur = isLongBreak
              ? s.settings.focusMode.longBreakDurationMin * 60
              : s.settings.focusMode.breakDurationMin * 60;
            get().startBreak(dur);
            if (isLongBreak) {
              setTimeout(() => sbToast.info("Long break!", "You earned a longer rest after a full cycle."), 600);
            }
          }, 1800);
        }
      },

      startBreak: (durationSec) => {
        const dur = durationSec ?? get().settings.focusMode.breakDurationMin * 60;
        set({
          breakActive: true,
          breakStartedAt: Date.now(),
          breakDurationSec: dur,
        });
        sbToast.info("Break started", `Take ${Math.floor(dur / 60)} min off. You earned it.`);
      },

      endBreak: () => {
        set({ breakActive: false, breakStartedAt: null });
        sbToast.info("Break ended", "Ready to focus again?");
      },

      toggleTabsPaused: () => {
        const next = !get().tabsPaused;
        set({ tabsPaused: next });
        if (next) {
          sbToast.info("Background tabs paused", "Inactive tabs are suspended to save RAM/CPU. Active tab keeps running.");
        } else {
          sbToast.info("Tabs resumed", "All tabs are active again.");
        }
      },

      startStudySession: () => {
        if (get().sessionStart) return;
        set({ sessionStart: Date.now() });
      },
      endStudySession: () => {
        const s = get();
        if (!s.sessionStart) return;
        const elapsed = Math.floor((Date.now() - s.sessionStart) / 1000);
        set({ studySeconds: s.studySeconds + elapsed, sessionStart: null });
      },
      addStudySeconds: (sec) => set((s) => ({ studySeconds: s.studySeconds + sec })),

      addNote: (text, meta) => {
        set((s) => ({
          notes: [
            {
              id: uid("note"),
              text,
              createdAt: Date.now(),
              tags: [],
              ...meta,
            },
            ...s.notes,
          ],
        }));
        sbToast.noteSaved();
      },
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      pinNote: (id, pinned) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, pinned } : n)),
        })),
      updateNoteTags: (id, tags) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, tags } : n)),
        })),

      addToLibrary: (item) => {
        set((s) => ({
          library: [
            {
              ...item,
              id: uid("lib"),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            ...s.library,
          ],
        }));
        sbToast.librarySaved(item.kind);
      },
      removeFromLibrary: (id) =>
        set((s) => ({ library: s.library.filter((l) => l.id !== id) })),
      visitLibraryItem: (id) =>
        set((s) => ({
          library: s.library.map((l) =>
            l.id === id
              ? {
                  ...l,
                  visitCount: (l.visitCount ?? 0) + 1,
                  lastVisitedAt: Date.now(),
                  updatedAt: Date.now(),
                }
              : l
          ),
        })),
      addHighlight: (pdfUrl, text, note) => {
        const h: PdfHighlight = {
          id: uid("hl"),
          pdfUrl,
          text,
          note,
          color: "oklch(0.82 0.12 84 / 0.25)",
          createdAt: Date.now(),
        };
        set((s) => ({ highlights: [h, ...s.highlights].slice(0, 500) }));
        sbToast.info("Highlight saved", "Added to your PDF annotations.");
      },
      removeHighlight: (id) =>
        set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })),

      addWorkspace: (name, color, portalId) => {
        const id = uid("ws");
        set((s) => ({
          workspaces: [
            ...s.workspaces,
            { id, name, color: color ?? "#a16207", portalId, createdAt: Date.now() },
          ],
        }));
        return id;
      },
      deleteWorkspace: (id) =>
        set((s) => ({ workspaces: s.workspaces.filter((w) => w.id !== id) })),

      recordCommand: (id, label) =>
        set((s) => ({
          recentCommands: [
            { id, label, timestamp: Date.now() },
            ...s.recentCommands.filter((c) => c.id !== id),
          ].slice(0, 8),
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      setNoteDraft: (text, tags) =>
        set({ noteDraftText: text, noteDraftTags: tags }),
      resetOnboarding: () =>
        set((s) => ({
          settings: { ...s.settings, onboardingCompleted: false },
          overlay: "onboarding",
        })),
      completeOnboarding: () =>
        set((s) => ({
          settings: { ...s.settings, onboardingCompleted: true },
          overlay: null,
        })),
    }),
    {
      name: "study-browser-state",
      version: 2,
      // only persist data, not transient overlay/focus runtime
      partialize: selectPersisted,
      // Migration: zustand v5 hands us the persisted INNER state and expects
      // the persisted shape back (the middleware merges it into the live
      // store itself, so absent keys simply keep their current values).
      // Merge new default settings fields for users with old persisted
      // state (e.g. goals, focusMode.autoBreak/timerOpacity were added in
      // later rounds and may be missing from v1 persisted state).
      migrate: (persistedState: unknown, version: number): PersistedLumenState => {
        const prev = ((persistedState && typeof persistedState === "object"
          ? persistedState
          : {}) ?? {}) as Partial<PersistedLumenState>;
        if (version >= 2) {
          return prev as PersistedLumenState;
        }
        const d = DEFAULT_SETTINGS;
        const oldSettings = (prev.settings ?? {}) as Record<string, unknown>;
        return {
          ...prev,
          settings: {
            ...d,
            ...oldSettings,
            focusMode: { ...d.focusMode, ...(oldSettings.focusMode as Record<string, unknown> ?? {}) },
            tracking: { ...d.tracking, ...(oldSettings.tracking as Record<string, unknown> ?? {}) },
            ai: { ...d.ai, ...(oldSettings.ai as Record<string, unknown> ?? {}) },
            browser: { ...d.browser, ...(oldSettings.browser as Record<string, unknown> ?? {}) },
            goals: { ...d.goals, ...(oldSettings.goals as Record<string, unknown> ?? {}) },
          } as Settings,
        } as PersistedLumenState;
      },
    }
  )
);

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export { uid };
