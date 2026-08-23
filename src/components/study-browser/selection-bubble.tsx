"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { sanitizeText } from "@/lib/sanitize";

const BUBBLE_W = 280; // approx rendered width incl. padding
const BUBBLE_H = 36;
// SECURITY-UI: webpage content is untrusted. Cap what we ever hold in
// memory or hand to notes/AI, and strip control/bidi characters.
const MAX_SELECTION = 5000;

/**
 * SelectionBubble — appears above a text selection in the browser-owned
 * chrome. In web preview we can't read selections inside a cross-origin
 * iframe; this listens for selection in our OWN chrome. In the Electron
 * build a preload script surfaces this same bubble for the study site.
 *
 * Guards:
 *  - Never appears for selections inside inputs / contenteditable.
 *  - Clamped to the viewport (flips below the selection near the top edge,
 *    stays inside left/right edges).
 *  - Doesn't re-trigger for an unchanged selection.
 *  - Selected text is sanitized and length-capped before use.
 */
export function SelectionBubble() {
  const s = useStore();
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);
  const lastSelRef = useRef("");

  useEffect(() => {
    function update() {
      if (useStore.getState().overlay) { setSel(null); return; }
      const selection = window.getSelection();
      const raw = selection?.toString() ?? "";
      const text = sanitizeText(raw, MAX_SELECTION).trim();
      // Ignore trivially small or unchanged selections
      if (!text || text.length < 3 || text === lastSelRef.current) {
        if (!text) lastSelRef.current = "";
        return;
      }
      // Don't hijack selections inside form fields or editable regions
      const anchor = selection?.anchorNode;
      const el = anchor?.nodeType === 1 ? (anchor as HTMLElement) : anchor?.parentElement;
      if (!el || el.closest("input, textarea, select, [contenteditable]")) return;

      const rangeCount = selection?.rangeCount ?? 0;
      if (!rangeCount) return;
      const rect = selection!.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      lastSelRef.current = text;

      // Clamp inside viewport; flip below the selection when near the top edge
      const vw = window.innerWidth;
      let x = rect.left + rect.width / 2;
      x = Math.max(BUBBLE_W / 2 + 8, Math.min(vw - BUBBLE_W / 2 - 8, x));
      let y = rect.top - 8 - BUBBLE_H;
      if (y < 8) y = Math.min(window.innerHeight - BUBBLE_H - 8, rect.bottom + 12);

      setSel({ text, x, y });
    }

    function onDocClick() {
      // Defer so the browser can update the selection state first
      setTimeout(update, 0);
    }

    document.addEventListener("selectionchange", onDocClick);
    document.addEventListener("mouseup", onDocClick);
    document.addEventListener("keyup", onDocClick);
    return () => {
      document.removeEventListener("selectionchange", onDocClick);
      document.removeEventListener("mouseup", onDocClick);
      document.removeEventListener("keyup", onDocClick);
    };
  }, []);

  function act(action: "explain" | "simplify" | "note" | "ai") {
    if (!sel) return;
    const clean = sanitizeText(sel.text, MAX_SELECTION);
    if (action === "note") {
      s.addNote(clean, {
        url: s.tabs.find((t) => t.id === s.activeTabId)?.url,
        tabTitle: s.tabs.find((t) => t.id === s.activeTabId)?.title,
        selection: clean,
        tags: ["selection"],
      });
      s.closeOverlay();
    } else {
      s.setOverlay("ai", { text: clean, action });
    }
    lastSelRef.current = "";
    window.getSelection()?.removeAllRanges();
    setSel(null);
  }

  return (
    <AnimatePresence>
      {sel && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.12 }}
          role="toolbar"
          aria-label="Selection actions"
          className="absolute z-40 -translate-x-1/2"
          style={{ left: sel.x, top: sel.y }}
        >
          <div className="sb-glass sb-glass-gold flex items-center gap-0.5 rounded-full p-1 shadow-xl">
            <BubbleBtn label="Explain" onClick={() => act("explain")} />
            <BubbleBtn label="Simplify" onClick={() => act("simplify")} />
            <BubbleBtn label="Note" onClick={() => act("note")} />
            <BubbleBtn label="AI" onClick={() => act("ai")} gold />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BubbleBtn({ label, onClick, gold }: { label: string; onClick: () => void; gold?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        gold
          ? "bg-[oklch(0.82_0.12_84)] text-[oklch(0.13_0.004_260)] hover:bg-[oklch(0.88_0.10_84)]"
          : "text-foreground hover:bg-secondary/70"
      }`}
    >
      {label}
    </button>
  );
}
