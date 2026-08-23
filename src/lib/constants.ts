import type { StudyPortal, Settings, StudyPortalId } from "./types";

export const STUDY_PORTALS: StudyPortal[] = [
  {
    id: "pw",
    name: "Physics Wallah",
    url: "https://www.pw.live",
    category: "Coaching",
    color: "#1d4ed8",
    glyph: "PW",
    embeddable: false,
    description: "JEE / NEET / Foundation lectures",
  },
  {
    id: "unacademy",
    name: "Unacademy",
    url: "https://unacademy.com",
    category: "Coaching",
    color: "#08bd80",
    glyph: "UN",
    embeddable: false,
    description: "Live & recorded lectures for competitive exams",
  },
  {
    id: "nptel",
    name: "NPTEL",
    url: "https://nptel.ac.in",
    category: "College",
    color: "#b91c1c",
    glyph: "NP",
    embeddable: true,
    description: "Free college-level engineering & science courses",
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com",
    category: "Video",
    color: "#dc2626",
    glyph: "YT",
    embeddable: false,
    description: "Free video lectures & tutorials (study playlists)",
  },
  {
    id: "lms",
    name: "College LMS",
    url: "",
    category: "College",
    color: "#7c3aed",
    glyph: "LM",
    embeddable: true,
    description: "Your college's Learning Management System (Moodle / Canvas)",
  },
  {
    id: "custom",
    name: "Custom URL",
    url: "",
    category: "Custom",
    color: "#a16207",
    glyph: "↗",
    embeddable: true,
    description: "Any website of your choice",
  },
];

export const PORTAL_MAP: Record<StudyPortalId, StudyPortal> = STUDY_PORTALS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<StudyPortalId, StudyPortal>
);

// A friendly, embeddable demo study surface shown when a portal blocks embedding
// or before the user picks one. Simulates a "fullscreen study website".
export const DEMO_STUDY_URL = "/study-surface";

export const DEFAULT_SETTINGS: Settings = {
  theme: "deep-space",
  accentGold: true,
  reduceMotion: false,
  startupPortal: null,
  startupRestoreTabs: true,
  focusMode: {
    defaultDurationMin: 25,
    blockNotifications: true,
    hideTimer: false,
    timerOpacity: 1,
    autoBreak: true,
    breakDurationMin: 5,
    cycleLength: 4,
    longBreakEvery: 4,
    longBreakDurationMin: 15,
  },
  tracking: {
    enabled: true,
    trackVideoPosition: true,
    trackScrollPosition: true,
    autoResumePrompt: true,
  },
  ai: {
    enabled: false,
    provider: "zai",
    autoSummarize: false,
  },
  browser: {
    blockAdsInStudySites: false,
    hardwareAcceleration: true,
    sleepBackgroundTabs: true,
    pdfViewer: "internal",
  },
  goals: {
    dailyMin: 60,
    weeklyMin: 300,
    enabled: true,
  },
  onboardingCompleted: false,
};

export const SHORTCUTS = [
  { keys: ["Ctrl", "K"], label: "Study Command Center", group: "Core" },
  { keys: ["Ctrl", "L"], label: "Navigate / Search URL", group: "Core" },
  { keys: ["Ctrl", "Shift", "/"], label: "Shortcuts reference card", group: "Core" },
  { keys: ["Ctrl", "Tab"], label: "Next tab", group: "Tabs" },
  { keys: ["Ctrl", "Shift", "Tab"], label: "Previous tab", group: "Tabs" },
  { keys: ["Ctrl", "T"], label: "New tab", group: "Tabs" },
  { keys: ["Ctrl", "W"], label: "Close tab", group: "Tabs" },
  { keys: ["Ctrl", "Shift", "T"], label: "Reopen closed tab", group: "Tabs" },
  { keys: ["Alt", "←"], label: "Back", group: "History" },
  { keys: ["Alt", "→"], label: "Forward", group: "History" },
  { keys: ["Ctrl", "R"], label: "Reload", group: "History" },
  { keys: ["Ctrl", "F"], label: "Find in page", group: "History" },
  { keys: ["Ctrl", "Shift", "N"], label: "Quick Note", group: "Study" },
  { keys: ["Ctrl", "Shift", "F"], label: "Focus Mode", group: "Study" },
  { keys: ["Ctrl", "Shift", "L"], label: "Study Library", group: "Study" },
  { keys: ["Ctrl", "Shift", "P"], label: "Pause / resume tabs", group: "Study" },
  { keys: ["Ctrl", ","], label: "Settings", group: "System" },
  { keys: ["Esc"], label: "Close overlay", group: "System" },
] as const;
