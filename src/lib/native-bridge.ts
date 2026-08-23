"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * NativeBridge — wires the React UI to the Electron main process when
 * running as a packaged desktop app. In the web preview this is a no-op.
 *
 * Responsibilities:
 *  - When the active tab URL changes, call window.lumen.studyNavigate(url)
 *    so the native study WebContentsView loads the real study site
 *    (bypassing iframe embedding restrictions).
 *  - Listen for native accelerator triggers (Ctrl+K, Ctrl+L, etc.) and
 *    dispatch them to the same store actions the in-shell keyboard handler
 *    would have fired.
 *
 * PERF:
 *  - The component subscribes only to the two slices it renders/depends on
 *    (active URL + overlay), NOT the whole store — no re-render/re-subscribe
 *    storms while the user types in notes or settings.
 *  - Shortcut listeners attach ONCE on mount and read fresh state via
 *    useStore.getState() inside each callback.
 */

declare global {
  interface Window {
    lumen?: {
      studyNavigate: (url: string) => Promise<void>;
      studyReload: () => Promise<void>;
      studyBack: () => Promise<void>;
      studyForward: () => Promise<void>;
      studyGetState: () => Promise<{ url: string; title: string }>;
      studySetVisible: (visible: boolean) => Promise<void>;
      pdfPick: () => Promise<{ path: string; fileUrl: string; name: string } | null>;
      pdfOpen: (fileUrl: string) => Promise<boolean>;
      onShortcut: (channel: string, cb: () => void) => () => void;
      isNative: () => boolean;
    };
  }
}

export function isNative(): boolean {
  return typeof window !== "undefined" && !!window.lumen?.isNative();
}

export function NativeBridge() {
  // Narrow selectors — re-render only when these exact values change.
  const activeUrl = useStore(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.url ?? ""
  );
  const reloadToken = useStore((s) => s.reloadToken);
  const overlay = useStore((s) => s.overlay);

  // Mount log (once)
  useEffect(() => {
    if (!isNative()) return;
    console.log("[LumenBridge] active — window.lumen detected");
  }, []);

  // Sync active tab URL (+ explicit reload) to the native study view
  useEffect(() => {
    if (!isNative()) return;
    const url = activeUrl;
    if (!url) return;
    // SECURITY: Don't send internal routes to the native study view —
    // they should load in the renderer's webContents (the Next.js app),
    // not in the study WebContentsView (which is for external websites).
    const origin = window.location.origin;
    if (url.startsWith("/") || url.startsWith(origin)) {
      // Internal route — hide the native view so this window's content
      // (e.g. the internal demo surface / pdf viewer) is visible.
      window.lumen?.studySetVisible(false).catch(() => {});
      return;
    }
    // Local PDFs previously imported via the native picker — load through
    // the validated pdf:open channel (main re-checks .pdf + existence).
    if (url.startsWith("file:")) {
      console.log(`[LumenBridge] open local pdf → ${url}`);
      window.lumen?.pdfOpen(url).catch(() => {});
      return;
    }
    if (url.startsWith("blob:")) {
      // Web-preview blob PDF — rendered by this window's iframe, hide native.
      window.lumen?.studySetVisible(false).catch(() => {});
      return;
    }
    console.log(`[LumenBridge] navigate → ${url}`);
    window.lumen?.studyNavigate(url).catch(() => {});
  }, [activeUrl, reloadToken]);

  // Show the native study view only when no overlay is open — overlays live
  // in this window's content layer, underneath the study WebContentsView.
  useEffect(() => {
    if (!isNative()) return;
    window.lumen?.studySetVisible(!overlay).catch(() => {});
  }, [overlay]);

  // Native shortcut triggers — attached once; fresh state via getState()
  useEffect(() => {
    if (!isNative()) return;
    const st = () => useStore.getState();
    const unsubscribers: (() => void)[] = [];
    const map: Record<string, () => void> = {
      "shortcut:command-center": () =>
        st().setOverlay(st().overlay === "command-center" ? null : "command-center"),
      "shortcut:navigate": () => st().setOverlay("navigate"),
      "shortcut:library": () => st().setOverlay("library"),
      "shortcut:quick-note": () => st().setOverlay("quick-note"),
      "shortcut:focus": () => (st().focusActive ? st().endFocus(true) : st().startFocus()),
      // Native Ctrl+Tab: preview-cycle in the switcher; the highlighted tab
      // commits when main reports the Ctrl release ("shortcut:tab-release").
      "shortcut:next-tab": () => {
        const s = st();
        if (s.overlay === "tab-switcher") s.bumpTabSwitcher(1);
        else s.openTabSwitcher(true);
      },
      "shortcut:prev-tab": () => {
        const s = st();
        if (s.overlay === "tab-switcher") s.bumpTabSwitcher(-1);
        else s.openTabSwitcher(true);
      },
      "shortcut:tab-release": () => st().commitTabSwitcher(),
      "shortcut:new-tab": () => { st().newTab(); st().setOverlay("navigate"); },
      "shortcut:close-tab": () => {
        const s = st();
        if (s.activeTabId) s.closeTab(s.activeTabId);
      },
      "shortcut:reopen-tab": () => st().reopenClosedTab(),
      "shortcut:reload": () => st().reloadTab(),
      "shortcut:find": () => st().setOverlay("find"),
      "shortcut:settings": () => st().setOverlay("settings"),
      "shortcut:back": () => st().goBack(),
      "shortcut:forward": () => st().goForward(),
      "shortcut:escape": () => st().closeOverlay(),
      "shortcut:open-pdf": () => {
        // Dynamic import avoided — static is fine (small module).
        void import("@/lib/pdf-import").then((m) => m.importPdf());
      },
    };
    for (const [channel, fn] of Object.entries(map)) {
      unsubscribers.push(
        window.lumen!.onShortcut(channel, fn)
      );
    }
    return () => unsubscribers.forEach((u) => u());
  }, []);

  return null;
}
