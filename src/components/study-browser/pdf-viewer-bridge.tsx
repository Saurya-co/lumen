"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { sbToast } from "@/lib/toast";

/**
 * SECURITY: Origin allowlist for postMessage. Only messages from the
 * app's own origin (web preview) or the null origin (sandboxed iframes,
 * which is what our internal /pdf-viewer and /study-surface routes use
 * when loaded in a sandboxed iframe) are accepted.
 *
 * A malicious website loaded in the study iframe CANNOT spoof these
 * messages because:
 *  1. We validate `ev.origin` against the allowlist below.
 *  2. We validate the `source` field against known internal sources.
 *  3. We sanitize all text fields (length limit + string coercion).
 *  4. We validate `action` against an allowlist.
 *  5. No HTML from messages is ever rendered unsanitized.
 */
const VALID_SOURCES = new Set(["lumen-pdf-viewer", "lumen-study-surface"]);
const VALID_ACTIONS = new Set([
  "note", "highlight", "annotate", "explain", "simplify", "ai", "summarize",
]);
const MAX_TEXT_LENGTH = 10000; // 10KB — prevent memory abuse
const MAX_TITLE_LENGTH = 200;

/**
 * IframeBridge — listens for postMessage events from the in-app PDF viewer
 * (`/pdf-viewer`) and the demo study surface (`/study-surface`). These
 * embeddable routes can't access the parent store directly (cross-origin
 * iframe in web preview, separate webContents in Electron), so they post
 * `{ source, action, text, title }` messages.
 *
 * SECURITY: Every field is validated. Origin is checked. Text is length-
 * limited and string-coerced. Action is allowlisted. No message can
 * trigger arbitrary code execution or filesystem access.
 */
export function PdfViewerBridge() {
  const s = useStore();

  useEffect(() => {
    function handler(ev: MessageEvent) {
      // SECURITY: Origin validation
      // In web preview, our internal routes share the same origin.
      // Sandboxed iframes post with origin "null" — we accept that too
      // but ONLY for messages that pass the source + action allowlist.
      const ourOrigin = typeof window !== "undefined" ? window.location.origin : "";
      if (ev.origin !== ourOrigin && ev.origin !== "null") {
        return; // reject cross-origin messages from external sites
      }

      const data = ev.data;
      if (!data || typeof data !== "object") return;

      // SECURITY: only accept messages from OUR own origin (the internal
      // /pdf-viewer and /study-surface routes). Cross-origin iframes and
      // hostile pages must never be able to drive privileged UI actions.
      if (ev.origin !== window.location.origin) return;

      // Validate source
      if (!VALID_SOURCES.has(data.source)) return;

      // Validate + sanitize action
      const action = String(data.action ?? "");
      if (!VALID_ACTIONS.has(action)) return;

      // Sanitize text — string-coerce, length-limit, strip control chars
      let text = "";
      if (typeof data.text === "string") {
        text = data.text.slice(0, MAX_TEXT_LENGTH).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
      }

      // Sanitize title
      let title = "";
      if (typeof data.title === "string") {
        title = data.title.slice(0, MAX_TITLE_LENGTH).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
      }
      if (!title) {
        title = data.source === "lumen-study-surface" ? "Demo lecture" : "PDF document";
      }

      if (action === "highlight") {
        const activeTab = s.tabs.find((t) => t.id === s.activeTabId);
        if (activeTab?.url) {
          s.addHighlight(activeTab.url, text);
        }
        s.addNote(text, {
          url: activeTab?.url,
          tabTitle: activeTab?.title,
          selection: text,
          tags: ["pdf", "highlight"],
        });
      } else if (action === "note" || action === "annotate") {
        const activeTab = s.tabs.find((t) => t.id === s.activeTabId);
        s.addNote(text || `(${action})`, {
          url: activeTab?.url,
          tabTitle: activeTab?.title,
          selection: text,
          tags: [data.source === "lumen-study-surface" ? "lecture" : "pdf", action],
        });
        sbToast.info(`${action.charAt(0).toUpperCase() + action.slice(1)} saved`, `From ${title}`);
      } else if (action === "explain" || action === "simplify") {
        s.setOverlay("ai", { text: text || `Explain key concepts from ${title}`, action: action as "explain" | "simplify" });
      } else if (action === "ai" || action === "summarize") {
        const aiAction = action === "summarize" ? "summarize" : "ask";
        s.setOverlay("ai", { text: text || title, action: aiAction as "summarize" | "ask" });
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [s]);

  return null;
}
