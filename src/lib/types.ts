// Core type definitions for Study Browser

export type StudyPortalId =
  | "pw"
  | "unacademy"
  | "nptel"
  | "youtube"
  | "lms"
  | "custom";

export interface StudyPortal {
  id: StudyPortalId;
  name: string;
  url: string;
  category: string;
  color: string; // accent hint
  glyph: string; // single char / emoji
  embeddable: boolean; // can be loaded in iframe (web preview)
  description: string;
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  portalId?: StudyPortalId;
  favicon?: string;
  createdAt: number;
  lastAccessed: number;
  // resume position tracking
  scrollRatio?: number;
  videoTimeSec?: number;
  // workspace
  workspaceId?: string;
}

export interface QuickNote {
  id: string;
  text: string;
  url?: string;
  tabTitle?: string;
  selection?: string;
  createdAt: number;
  tags: string[];
  pinned?: boolean;
  workspaceId?: string;
}

export interface LibraryItem {
  id: string;
  kind: "note" | "bookmark" | "pdf" | "lecture";
  title: string;
  url?: string;
  excerpt?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  portalId?: StudyPortalId;
  workspaceId?: string;
  position?: { scrollRatio?: number; videoTimeSec?: number };
  visitCount?: number;
  lastVisitedAt?: number;
}

export interface PdfHighlight {
  id: string;
  pdfUrl: string;
  text: string;
  note?: string;
  color: string;
  createdAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  portalId?: StudyPortalId;
  createdAt: number;
}

export interface FocusSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  durationSec: number;
  tabTitle?: string;
  url?: string;
  portalId?: StudyPortalId;
  completed: boolean;
}

export interface RecentCommand {
  id: string;
  label: string;
  timestamp: number;
}

export type OverlayKind =
  | null
  | "command-center"
  | "navigate"
  | "tab-switcher"
  | "quick-note"
  | "focus"
  | "focus-presets"
  | "library"
  | "settings"
  | "onboarding"
  | "portal-picker"
  | "find"
  | "selection-bubble"
  | "ai"
  | "shortcuts";

export interface SelectionBubbleData {
  text: string;
  // Position is only set when the bubble is anchored to a real selection;
  // palette/AI entries omit it.
  x?: number;
  y?: number;
  action?: "summarize" | "explain" | "simplify" | "ask" | "ai";
}

export interface Settings {
  theme: "deep-space" | "charcoal" | "midnight";
  accentGold: boolean;
  reduceMotion: boolean;
  startupPortal: StudyPortalId | null;
  startupRestoreTabs: boolean;
  focusMode: {
    defaultDurationMin: number;
    blockNotifications: boolean;
    hideTimer: boolean;
    timerOpacity: number; // 0.5–1, floating timer opacity
    autoBreak: boolean;
    breakDurationMin: number;
    cycleLength: number;
    longBreakEvery: number;
    longBreakDurationMin: number;
  };
  tracking: {
    enabled: boolean;
    trackVideoPosition: boolean;
    trackScrollPosition: boolean;
    autoResumePrompt: boolean;
  };
  ai: {
    enabled: boolean;
    provider: "zai" | "none";
    autoSummarize: boolean;
  };
  browser: {
    blockAdsInStudySites: boolean;
    hardwareAcceleration: boolean;
    sleepBackgroundTabs: boolean;
    pdfViewer: "internal" | "browser";
  };
  goals: {
    dailyMin: number;
    weeklyMin: number;
    enabled: boolean;
  };
  onboardingCompleted: boolean;
}

export type CommandContext = "lecture" | "pdf" | "webpage" | "youtube" | "any";

export interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string[];
  context: CommandContext;
  icon?: string;
  group: "study" | "navigate" | "tab" | "note" | "focus" | "ai" | "system";
  keywords?: string[];
  run: () => void;
}
