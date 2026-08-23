/**
 * Lumen — Study Browser · Electron main process
 * =============================================
 *
 * This is the desktop shell that wraps the Next.js UI into a Chromium-based
 * Windows application. It:
 *  - opens a frameless, chromeless BrowserWindow (the study UI is the screen)
 *  - hosts the user's study website inside a child WebContentsView that
 *    fills the entire window (the Next.js UI overlays on top with
 *    `transparent: true` and never intercepts mouse events on the page area
 *    unless an overlay is active)
 *  - strips X-Frame-Options / CSP frame-ancestors so real study sites
 *    (PW, Unacademy, YouTube, LMS, …) render fullscreen
 *  - registers native accelerator shortcuts (Ctrl+K, Ctrl+L, Ctrl+Tab, …)
 *    that work even when keyboard focus is inside the study site
 *  - forwards tab/URL changes from the renderer to the study WebContentsView
 *
 * Build:
 *   bun install --dev electron electron-builder
 *   bun run electron:dev        # local dev (loads Next.js at http://localhost:3000)
 *   bun run electron:build      # produce dist/Lumen-Setup.exe + portable exe
 *
 * See electron/README.md for the full build flow.
 */

import { app, BrowserWindow, session, ipcMain, WebContentsView, dialog } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

// Whether we're running against the Next.js dev server or a packaged build.
const DEV = process.env.LUMEN_DEV === "1" || !app.isPackaged;
const RENDERER_URL = DEV
  ? "http://localhost:3000"
  : `file://${path.join(app.getAppPath(), "out", "index.html")}`;

// KEYBOARD ARCHITECTURE
// ---------------------
// Shortcuts are handled at exactly TWO layers, never both:
//   1. study-view focused  → before-input-event below (channelForInput)
//   2. shell UI focused    → renderer keydown hook (use-keyboard-shortcuts.ts)
//
// We deliberately do NOT use globalShortcut: it registers OS-wide hotkeys
// that would steal Ctrl+K / Ctrl+Tab from EVERY other application while
// Lumen runs, and it duplicates layer 1 causing double-fired actions.

// NOTE: Overlay visibility is managed by the renderer via studySetVisible,
// so overlays appear above the webpage and non-overlay shortcuts (like
// focus mode's floating timer) never black out the screen.

/**
 * Map a raw keyboard input (from before-input-event) to a shortcut channel.
 * Uses DOM KeyboardEvent.key semantics. Also reports Control keyUp so the
 * native Ctrl+Tab switcher can commit when the modifier is released (the
 * study webContents never delivers keyup to the renderer itself).
 */
function channelForInput(input: {
  type: string;
  key: string;
  control: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}): string | null {
  const ctrl = input.control || input.meta;
  const key = input.key.toLowerCase();
  const shift = input.shift;
  const alt = input.alt;

  if (input.type === "keyUp") {
    if (!shift && !alt && ctrl && key === "control") return "shortcut:tab-release";
    if (!ctrl && !alt && !shift && key === "escape") return null; // Esc handled on keyDown only
    return null;
  }
  if (input.type !== "keyDown") return null;

  if (ctrl && !shift && !alt && key === "k") return "shortcut:command-center";
  if (ctrl && !shift && !alt && key === "l") return "shortcut:navigate";
  if (ctrl && shift && !alt && key === "l") return "shortcut:library";
  if (ctrl && shift && !alt && key === "n") return "shortcut:quick-note";
  if (ctrl && shift && !alt && key === "f") return "shortcut:focus";
  if (ctrl && !shift && !alt && key === "tab") return "shortcut:next-tab";
  if (ctrl && shift && !alt && key === "tab") return "shortcut:prev-tab";
  if (ctrl && !shift && !alt && key === "t") return "shortcut:new-tab";
  if (ctrl && !shift && !alt && key === "w") return "shortcut:close-tab";
  if (ctrl && shift && !alt && key === "t") return "shortcut:reopen-tab";
  if (ctrl && !shift && !alt && key === "r") return "shortcut:reload";
  if (ctrl && !shift && !alt && key === "f") return "shortcut:find";
  if (ctrl && !shift && !alt && key === ",") return "shortcut:settings";
  if (ctrl && !shift && !alt && key === "o") return "shortcut:open-pdf";
  if (alt && !ctrl && key === "arrowleft") return "shortcut:back";
  if (alt && !ctrl && key === "arrowright") return "shortcut:forward";
  if (!ctrl && !alt && key === "escape") {
    // Only meaningful when an overlay is open; the renderer decides.
    return "shortcut:escape";
  }
  return null;
}

console.log("[Lumen] =========================================");
console.log("[Lumen] Starting Lumen Study Browser");
console.log("[Lumen] DEV:", DEV);
console.log("[Lumen] RENDERER_URL:", RENDERER_URL);
console.log("[Lumen] app.getAppPath():", app.getAppPath());
console.log("[Lumen] app.getPath('exe'):", app.getPath('exe'));
console.log("[Lumen] =========================================");

let win: BrowserWindow | null = null;
// The child WebContentsView that hosts the user's study website fullscreen.
let studyView: WebContentsView | null = null;

// Single funnel for every shortcut trigger (study-view key interception).
// NOTE: we intentionally do NOT hide the study view here — overlays live in
// the renderer, and the renderer's NativeBridge effect calls
// studySetVisible(false) whenever an overlay actually opens (and true when
// it closes). Hiding here would black out the screen for shortcuts that
// don't open overlays (e.g. focus mode, whose floating timer must sit ON
// TOP of the visible webpage).
function dispatchShortcut(channel: string) {
  win?.webContents.send(channel);
}

/**
 * Creates the main application window with robust error handling
 */
async function createWindow() {
  console.log("[Lumen] Creating main window...");

  try {
    // Window icon for dev (packaged builds embed icon via electron-builder).
    const iconPath = path.join(app.getAppPath(), "electron", "build", "icon.ico");
    const windowIcon = fs.existsSync(iconPath) ? iconPath : undefined;

    win = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 920,
      minHeight: 600,
      frame: false,                 // no native chrome — UI is the screen
      titleBarStyle: "hidden",
      backgroundColor: "#0a0a0f",
      show: false,                  // We'll show it when ready
      ...(windowIcon ? { icon: windowIcon } : {}),
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    console.log("[Lumen] Main window created successfully, ID:", win.id);

    // Pipe renderer DevTools console into our stdout so renderer-side
    // logs/errors are visible in the same terminal output.
    win.webContents.on("console-message", (_e, level, message, line, sourceId) => {
      const tag = ["LOG", "WARN", "ERROR"][level] ?? String(level);
      console.log(`[LumenRenderer:${tag}] ${message} (${sourceId}:${line})`);
    });

    // SECURITY: no DevTools in production builds (F12 / Ctrl+Shift+I).
    if (!DEV) {
      win.webContents.on("before-input-event", (event, input) => {
        const key = input.key.toLowerCase();
        if (key === "f12" || (input.control && input.shift && key === "i")) {
          event.preventDefault();
        }
      });
    }

    // Handle window events
    win.on("close", (event) => {
      console.log("[Lumen] Window closing...");
      // Prevent default to allow cleanup if needed
      // event.preventDefault();
    });

    win.on("closed", () => {
      console.log("[Lumen] Window closed");
      win = null;
    });

    win.on("show", () => {
      console.log("[Lumen] Window shown");
    });

    win.on("hide", () => {
      console.log("[Lumen] Window hidden");
    });

    win.on("ready-to-show", () => {
      console.log("[Lumen] Window ready-to-show");
      showWindow();
    });

    // NOTE: The study view is created lazily on first navigation
    // (study:navigate IPC). Creating it here with about:blank would paint an
    // opaque white layer over the Next.js UI.

    // Set up main window error handling
    win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
      console.error(`[Lumen] Main window failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
      showWindow(); // Show window even on load error so user can see error UI
    });

    win.webContents.on("render-process-gone", (event, details) => {
      console.error(`[Lumen] Main window renderer process gone:`, details);
      showWindow(); // Show window so user knows something is wrong
    });

    win.webContents.on("unresponsive", () => {
      console.warn("[Lumen] Main window unresponsive");
    });

    win.webContents.on("responsive", () => {
      console.log("[Lumen] Main window responsive again");
    });

    // Show window when ready, with multiple fallbacks
    let shown = false;
    const showWindow = () => {
      if (!shown && win) {
        shown = true;
        console.log("[Lumen] Showing window...");
        try {
          win.show();
          win.focus();
        } catch (error) {
          console.error("[Lumen] Error showing window:", error);
        }
      }
    };

    // Primary: show when ready-to-show
    win.once("ready-to-show", () => {
      console.log("[Lumen] Ready-to-show event received");
      showWindow();
    });

    // Fallback 1: force show after 3 seconds if ready-to-show never fires
    setTimeout(() => {
      if (!shown) {
        console.log("[Lumen] 3-second timeout - forcing window show");
        showWindow();
      }
    }, 3000);

    // Fallback 2: force show after 5 seconds as final fallback
    setTimeout(() => {
      if (!shown) {
        console.log("[Lumen] 5-second timeout - final forced window show");
        showWindow();
      }
    }, 5000);

    // Load the main application URL
    console.log("[Lumen] Loading main application URL:", RENDERER_URL);
    try {
      await win.loadURL(RENDERER_URL);
      console.log("[Lumen] Main application URL loaded successfully");
    } catch (loadError) {
      console.error("[Lumen] Failed to load main application URL:", loadError);
      showWindow(); // Show window so user can see error state
    }

    // Open DevTools in development mode
    if (DEV) {
      console.log("[Lumen] Opening DevTools");
      win.webContents.openDevTools({ mode: "detach" });
    }

  } catch (error) {
    console.error("[Lumen] FATAL ERROR creating window:", error);
    // Try to create a minimal error window so user knows something went wrong
    try {
      console.log("[Lumen] Attempting to create error fallback window...");
      win = new BrowserWindow({
        width: 800,
        height: 600,
        title: "Lumen - Error",
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      const errorMsg = error instanceof Error ? error.message : String(error);
      win.loadURL(`data:text/html,<body style='padding:20px; font-family:sans-serif'><h1>Lumen Application Error</h1><p>Failed to start the application properly.</p><p>Error: ${encodeURIComponent(errorMsg)}</p><p>Please check the logs for more details.</p></body>`);
      win.show();
    } catch (error2) {
      console.error("[Lumen] Failed to create error fallback window:", error2);
      // Last resort: quit the app
      app.quit();
    }
  }
}

// App lifecycle event handlers - register these first
console.log("[Lumen] Setting up application lifecycle event handlers...");
app.on("browser-window-created", () => {
  console.log("[Lumen] Browser window created event");
  /* hooks for future analytics */
});

app.on("window-all-closed", () => {
  console.log("[Lumen] All windows closed");
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  console.log("[Lumen] Second instance detected");
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

// IPC handlers for communication between renderer and main process
console.log("[Lumen] Setting up IPC handlers...");

// Navigate the study view to a URL.
// SECURITY: Only allow http(s) URLs. Block file:, javascript:, data:,
// and all custom protocol schemes to prevent local file access,
// script injection, and protocol-handler abuse.
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// ---- SECURITY: HTTPS-only mode ---------------------------------------------
// All plain-http navigations are silently upgraded to https. Local
// development servers (localhost / loopback) are exempt so local tools
// keep working. If a host has no TLS, Chromium shows its error page —
// there is deliberately NO plaintext fallback.
const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1)$/i;

function upgradeToHttps(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" && !LOCAL_HOST_RE.test(u.hostname)) {
      u.protocol = "https:";
      return u.toString();
    }
  } catch {
    /* invalid URL — caller handles */
  }
  return url;
}

// Lazily create the study WebContentsView on first navigation.
function ensureStudyView(): WebContentsView | null {
  if (studyView) return studyView;
  if (!win) {
    console.warn("[Lumen] Cannot create study view — no window");
    return null;
  }
  console.log("[Lumen] Creating study view (lazy)...");
  studyView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Chromium's built-in PDF viewer requires this flag — with it off,
      // loading any PDF renders a BLANK page. The viewer itself stays
      // inside this sandboxed renderer; enabling it does not weaken the
      // renderer/native boundary.
      plugins: true,
    },
  });
  win.contentView.addChildView(studyView);

  const layout = () => {
    if (!win || !studyView) return;
    const [w, h] = win.getContentSize();
    studyView.setBounds({ x: 0, y: 0, width: w, height: h });
  };
  win.on("resize", layout);
  layout();

  studyView.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
    console.warn(`[Lumen] Study view failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
  });
  studyView.webContents.on("render-process-gone", (_e, details) => {
    console.error("[Lumen] Study view renderer process gone:", details);
    studyView = null;
  });

  // PRIMARY shortcut mechanism: intercept keys inside the study site
  // BEFORE the webpage sees them. Works regardless of globalShortcut
  // registration success and never leaks to other apps.
  studyView.webContents.on("before-input-event", (event, input) => {
    const channel = channelForInput(input);
    if (!channel) return;
    event.preventDefault();
    dispatchShortcut(channel);
  });

  // ---- SECURITY: popup / window.open containment -------------------------
  // A malicious site must never get a NEW native window with default
  // (possibly weaker) webPreferences. Route safe http(s) popups into this
  // same sandboxed study view; deny everything else.
  studyView.webContents.setWindowOpenHandler(({ url }) => {
    console.warn("[Lumen] window.open intercepted:", url.slice(0, 120));
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { action: "deny" };
    }
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      setStudyVisible(true);
      studyView?.webContents.loadURL(upgradeToHttps(url)).catch(() => {});
      return { action: "deny" }; // we handled it in-process
    }
    return { action: "deny" };
  });

  // ---- SECURITY: navigation guard ----------------------------------------
  // Blocks page-initiated navigation (clicks, location=, redirects) away
  // from http(s)/about. Programmatic loadURL from our own IPC handlers is
  // NOT affected by will-navigate, so local-PDF loading still works.
  studyView.webContents.on("will-navigate", (event, url) => {
    let scheme = "";
    try {
      scheme = new URL(url).protocol;
    } catch {
      console.warn("[Lumen] Blocked unparseable navigation:", url.slice(0, 120));
      event.preventDefault();
      return;
    }

    if (scheme === "https:" || scheme === "blob:" || url === "about:blank") {
      return; // allowed
    }

    if (scheme === "http:") {
      // HTTPS-only: silently upgrade instead of allowing plaintext.
      const upgraded = upgradeToHttps(url);
      console.log(`[Lumen] HTTPS-only upgrade → ${upgraded.slice(0, 100)}`);
      event.preventDefault();
      studyView?.webContents.loadURL(upgraded).catch(() => {});
      return;
    }

    console.warn("[Lumen] Blocked study-view navigation to:", url.slice(0, 120));
    event.preventDefault();
  });

  return studyView;
}

// Whether the study view is currently attached to the window.
let studyVisible = false;

// Show/hide the study view. Hiding = detaching it from the contentView so
// the main window's own webContents (the Next.js UI + overlays) is visible.
function setStudyVisible(visible: boolean) {
  if (!win) return;
  if (visible && studyView && !studyVisible) {
    win.contentView.addChildView(studyView);
    const [w, h] = win.getContentSize();
    studyView.setBounds({ x: 0, y: 0, width: w, height: h });
    studyVisible = true;
    studyView.webContents.focus();
  } else if (!visible && studyView && studyVisible) {
    win.contentView.removeChildView(studyView);
    studyVisible = false;
  }
}

// Internal routes (relative paths) are loaded in the renderer's
// webContents, NOT in the study view — they never reach this handler.
ipcMain.handle("study:navigate", (_e, url: string) => {
  if (!url || typeof url !== "string") {
    console.warn("[Lumen] Invalid study:navigate call: invalid URL");
    return;
  }
  const view = ensureStudyView();
  if (!view) return;

  // Length limit to prevent abuse
  if (url.length > 8192) {
    console.warn("[Lumen] Study navigate URL too long:", url.length);
    return;
  }

  // Normalize: bare strings like "example.com" → "https://example.com"
  let target = url.trim();
  if (!/^https?:\/\//i.test(target) && !target.includes("://")) {
    target = `https://${target}`;
  }

  // Validate protocol
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    console.warn("[Lumen] Invalid URL in study:navigate:", url);
    return; // invalid URL — silently reject
  }
  
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    console.warn("[Lumen] Invalid protocol in study:navigate:", parsed.protocol);
    return; // reject file:, javascript:, data:, chrome:, etc.
  }

  // Lumen is a real browser surface: allow ANY http(s) site. Only protocol
  // validation applies (file:, javascript:, data:, custom schemes rejected
  // above) — no domain allowlist, no localhost blocking. This is a local
  // desktop app controlled by the user, not a server.

  // HTTPS-only: never load plaintext http
  target = upgradeToHttps(target);

  // Load the URL in the study view
  view.webContents.loadURL(target).catch((err) => {
    console.error(`[Lumen] Failed to load study URL ${target}:`, err);
    /* swallow load failures (e.g. blocked sites) — UI shows fallback */
  });
});

// Reload the study view
ipcMain.handle("study:reload", () => {
  console.log("[Lumen] Study view reload requested");
  if (studyView) {
    studyView.webContents.reload();
  }
});

// Back / forward navigation
ipcMain.handle("study:back", () => {
  console.log("[Lumen] Study view back requested");
  if (studyView?.webContents.navigationHistory.canGoBack()) {
    studyView.webContents.navigationHistory.goBack();
  }
});

ipcMain.handle("study:forward", () => {
  console.log("[Lumen] Study view forward requested");
  if (studyView?.webContents.navigationHistory.canGoForward()) {
    studyView.webContents.navigationHistory.goForward();
  }
});

// Capture the current study view URL + title (for the renderer's tab state)
ipcMain.handle("study:getState", () => ({
  url: studyView?.webContents.getURL() ?? "",
  title: studyView?.webContents.getTitle() ?? "",
}));

// Show/hide the study view so renderer overlays aren't hidden behind it
ipcMain.handle("study:setVisible", (_e, visible: boolean) => {
  setStudyVisible(!!visible);
});

// ============================================================================
// Local PDF import — native picker locked to .pdf files only
// ============================================================================

// SECURITY: the renderer never supplies arbitrary paths. The path comes
// from the OS open-dialog (user-chosen), and pdf:open re-validates that
// the URL is file:, ends with .pdf, and exists on disk before loading.
ipcMain.handle("pdf:pick", async () => {
  if (!win) return null;
  const res = await dialog.showOpenDialog(win, {
    title: "Import PDF",
    buttonLabel: "Import",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
    properties: ["openFile"],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  const p = res.filePaths[0];
  if (!p.toLowerCase().endsWith(".pdf")) {
    console.warn("[Lumen] pdf:pick rejected non-pdf selection:", p);
    return null;
  }
  console.log("[Lumen] PDF picked:", p);
  return { path: p, fileUrl: pathToFileURL(p).toString(), name: path.basename(p) };
});

ipcMain.handle("pdf:open", (_e, fileUrl: string) => {
  try {
    if (typeof fileUrl !== "string" || !fileUrl.startsWith("file:")) return false;
    const p = fileURLToPath(fileUrl);
    if (!p.toLowerCase().endsWith(".pdf")) return false;
    if (!fs.existsSync(p)) {
      console.warn("[Lumen] pdf:open file missing:", p);
      return false;
    }
    const v = ensureStudyView();
    if (!v) return false;
    setStudyVisible(true);
    v.webContents.loadURL(pathToFileURL(p).toString()).catch((err) => {
      console.error("[Lumen] Failed to load local PDF:", err);
    });
    return true;
  } catch (err) {
    console.error("[Lumen] pdf:open failed:", err);
    return false;
  }
});

// ============================================================================
// Lifecycle
// ============================================================================
console.log("[Lumen] Setting up application lifecycle...");

// ---- SECURITY: web permissions — deny by default --------------------------
// Websites (including study portals) must not silently get geolocation,
// camera/mic, notifications, clipboard reads, etc. Only benign presentation
// permissions are granted.
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    const allow = new Set(["fullscreen", "pointerLock", "clipboard-sanitized-write"]);
    const granted = allow.has(permission);
    if (!granted) console.warn("[Lumen] Denied web permission:", permission);
    callback(granted);
  });

  // ---- SECURITY: downloads — never silent, warn on dangerous types -------
  const DANGEROUS = /\.(exe|msi|bat|cmd|scr|ps1|vbs|js|jse|wsf|hta|com|cpl|jar)$/i;
  session.defaultSession.on("will-download", (_event, item) => {
    const name = item.getFilename();
    if (DANGEROUS.test(name)) {
      console.warn("[Lumen] Dangerous file type download started:", name);
    }
    // Force the Save As dialog every time — no silent drive-by downloads
    // into a fixed folder. Files are never executed automatically.
    item.setSaveDialogOptions({
      title: "Save download",
      defaultPath: name,
    });
  });
});

// Single instance lock — second instance just focuses the first
console.log("[Lumen] Checking for single instance lock...");
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.log("[Lumen] Another instance is already running - quitting");
  app.quit();
} else {
  console.log("[Lumen] Obtained single instance lock");
  app.whenReady().then(() => {
    console.log("[Lumen] Application is ready - initializing...");
    try {
      createWindow();

      app.on("activate", () => {
        console.log("[Lumen] Activate event received");
        if (BrowserWindow.getAllWindows().length === 0) {
          console.log("[Lumen] No windows exist - creating new window");
          createWindow();
        }
      });
    } catch (error) {
      console.error("[Lumen] Fatal error during application initialization:", error);
      // Try to quit gracefully
      app.quit();
    }
  }).catch((error) => {
    console.error("[Lumen] Error in whenReady promise:", error);
    app.quit();
  });
}

// Handle uncaught exceptions
process.on("uncaughtException", (error: unknown) => {
  console.error("[Lumen] Uncaught exception:", error);
  // Don't quit immediately - let the app try to continue
});

process.on("unhandledRejection", (reason: unknown, promise) => {
  console.error("[Lumen] Unhandled promise rejection:", reason);
  // Don't quit immediately - let the app try to continue
});

console.log("[Lumen] Initialization complete - waiting for events");