"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { importPdf } from "@/lib/pdf-import";

/**
 * Global keyboard shortcut handler for the Study Browser shell.
 *
 * PERF: the keydown listener is attached ONCE and reads fresh state via
 * `useStore.getState()` inside the handler — the component no longer
 * subscribes to the whole store, so typing in any input never re-binds
 * 20+ handlers per keystroke.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function isTextInput(t: EventTarget | null): boolean {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    }

    function handler(e: KeyboardEvent) {
      const s = useStore.getState();

      // First-run screens own the ENTIRE keyboard. Browser shortcuts must
      // not yank the user out of onboarding / portal selection — those
      // surfaces handle Enter, arrows and Escape themselves.
      if (s.overlay === "onboarding" || s.overlay === "portal-picker") {
        return;
      }

      // Esc always closes overlays (unless focus is in an uncloseable field)
      if (e.key === "Escape") {
        if (s.overlay) {
          e.preventDefault();
          s.closeOverlay();
          return;
        }
        if (s.focusActive) {
          e.preventDefault();
          s.endFocus(false);
          return;
        }
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();

      // Text inputs: let normal typing pass through untouched. Every
      // MODIFIED combo (Ctrl/Alt/Meta) is fair game everywhere — modified
      // keys can't produce characters, so shortcuts like Ctrl+Shift+N,
      // Ctrl+T, Ctrl+W, Ctrl+Shift+F… must keep working even while the
      // caret is inside the navigate box, portal search, or a note.
      if (isTextInput(e.target) && !ctrl && !alt) {
        return;
      }

      // Ctrl+K → Command Center
      if (ctrl && key === "k") {
        e.preventDefault();
        s.setOverlay(s.overlay === "command-center" ? null : "command-center");
        return;
      }

      // Ctrl+L → Navigate
      if (ctrl && !shift && key === "l") {
        e.preventDefault();
        s.setOverlay("navigate");
        return;
      }

      // Ctrl+Shift+L → Library
      if (ctrl && shift && key === "l") {
        e.preventDefault();
        s.setOverlay("library");
        return;
      }

      // Ctrl+Shift+N → Quick Note
      if (ctrl && shift && key === "n") {
        e.preventDefault();
        s.setOverlay("quick-note");
        return;
      }

      // Ctrl+Shift+F → Focus Mode
      if (ctrl && shift && key === "f") {
        e.preventDefault();
        if (s.focusActive) {
          s.endFocus(true);
        } else {
          s.startFocus();
        }
        return;
      }

      // Ctrl+, → Settings
      if (ctrl && key === ",") {
        e.preventDefault();
        s.setOverlay("settings");
        return;
      }

      // Ctrl+O → Import local PDF (file picker, .pdf only)
      if (ctrl && !shift && key === "o") {
        e.preventDefault();
        void importPdf();
        return;
      }

      // Ctrl+Shift+/ → Shortcuts reference card
      if (ctrl && shift && (key === "/" || key === "?")) {
        e.preventDefault();
        s.setOverlay(s.overlay === "shortcuts" ? null : "shortcuts");
        return;
      }

      // Ctrl+Shift+P → Pause / resume all background tabs
      if (ctrl && shift && key === "p") {
        e.preventDefault();
        s.toggleTabsPaused();
        return;
      }

      // Ctrl+Shift+1..9 → Quick switch to workspace N (opens library if needed)
      if (ctrl && shift && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        const ws = s.workspaces[idx];
        if (ws) {
          // Find a library item in this workspace with a URL and open it
          const item = s.library.find((l) => l.workspaceId === ws.id && l.url);
          if (item) {
            s.newTab(item.url!, item.title, item.portalId);
            s.visitLibraryItem(item.id);
          } else {
            // No items in this workspace — just open the library to it
            s.setOverlay("library");
          }
        }
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab → temporary tab switcher.
      // First press OPENS it (preview, no commit); further presses cycle a
      // preview highlight through the store tick — one code path for both
      // the shell (here), the study view (IPC → NativeBridge) and the
      // switcher itself, so presses can never double-step. The highlighted
      // tab commits on Ctrl release inside the switcher.
      if (ctrl && key === "tab") {
        e.preventDefault();
        if (s.overlay === "tab-switcher") {
          s.bumpTabSwitcher(shift ? -1 : 1);
        } else {
          s.openTabSwitcher(true);
        }
        return;
      }

      // Ctrl+T → new tab (also opens navigate overlay)
      if (ctrl && !shift && key === "t") {
        e.preventDefault();
        s.newTab();
        s.setOverlay("navigate");
        return;
      }

      // Ctrl+Shift+T → reopen closed tab
      if (ctrl && shift && key === "t") {
        e.preventDefault();
        s.reopenClosedTab();
        return;
      }

      // Ctrl+W → close tab
      if (ctrl && !shift && key === "w") {
        e.preventDefault();
        if (s.activeTabId) s.closeTab(s.activeTabId);
        return;
      }

      // Alt+Left / Alt+Right → back / forward
      if (alt && key === "arrowleft") {
        e.preventDefault();
        s.goBack();
        return;
      }
      if (alt && key === "arrowright") {
        e.preventDefault();
        s.goForward();
        return;
      }

      // Ctrl+R → reload
      if (ctrl && !shift && key === "r") {
        e.preventDefault();
        s.reloadTab();
        return;
      }

      // Ctrl+F → find
      if (ctrl && !shift && key === "f") {
        e.preventDefault();
        s.setOverlay("find");
        return;
      }
    }

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);
}
