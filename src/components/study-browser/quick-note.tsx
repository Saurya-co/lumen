"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { sanitizeText, sanitizeTitle } from "@/lib/sanitize";
import { Kbd } from "@/components/ui/kbd";

const NOTE_MAX = 5000;

export function QuickNote() {
  // Draft lives in the (unpersisted) store so an accidental Esc or
  // click-away never loses text — and no module globals are mutated.
  const draftText = useStore((s) => s.noteDraftText);
  const draftTags = useStore((s) => s.noteDraftTags);
  const setNoteDraft = useStore((s) => s.setNoteDraft);
  const closeOverlay = useStore((s) => s.closeOverlay);
  const addNote = useStore((s) => s.addNote);
  const activeTabId = useStore((s) => s.activeTabId);
  const tabs = useStore((s) => s.tabs);

  const [text, setText] = useState(draftText);
  const [tags, setTags] = useState(draftTags);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    inputRef.current?.focus();
    // Put the cursor at the end of a restored draft
    const len = draftText.length;
    inputRef.current?.setSelectionRange(len, len);
  }, []);

  function save() {
    const clean = sanitizeText(text).trim();
    if (!clean) return;
    addNote(clean, {
      url: activeTab?.url,
      tabTitle: activeTab?.title,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12),
    });
    setNoteDraft("", "");
    closeOverlay();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="absolute inset-0 z-50 flex items-end justify-end p-6 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="Quick note"
    >
      <div className="absolute inset-0" onClick={closeOverlay} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
        className="pointer-events-auto relative z-10 w-full max-w-sm"
      >
        <div className="sb-glass sb-glass-gold rounded-2xl overflow-hidden sb-anim-slide-up">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-base">📝</span>
              <div>
                <p className="text-xs font-medium text-foreground">Quick Note</p>
                <p className="max-w-[180px] truncate text-[0.6rem] text-muted-foreground">
                  {sanitizeTitle(activeTab?.title) || "no page"}
                </p>
              </div>
            </div>
            <Kbd>Esc</Kbd>
          </div>
          <div className="p-3">
            <textarea
              ref={inputRef}
              value={text}
              maxLength={NOTE_MAX}
              onChange={(e) => {
                setText(e.target.value);
                setNoteDraft(e.target.value, tags);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
              }}
              placeholder="Capture a thought — it links to this page automatically."
              rows={5}
              aria-label="Note text"
              className="max-h-56 w-full resize-y rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)] placeholder:text-muted-foreground/50 sb-scroll"
            />
            <div className="mt-1 flex items-center justify-between">
              <input
                value={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                  setNoteDraft(text, e.target.value);
                }}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="tags, comma, separated"
                aria-label="Note tags"
                className="w-full rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs text-foreground outline-none focus:border-[oklch(0.82_0.12_84)] placeholder:text-muted-foreground/50"
              />
              {text.length > 0 && (
                <span className="ml-2 shrink-0 text-[0.6rem] tabular-nums text-muted-foreground/60">
                  {text.length}/{NOTE_MAX}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
              <Kbd>Ctrl</Kbd> <Kbd>↵</Kbd> save · draft kept on close
            </span>
            <div className="flex gap-2">
              <button
                onClick={closeOverlay}
                className="rounded-md px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!text.trim()}
                className="rounded-md bg-[oklch(0.82_0.12_84)] px-3 py-1 text-xs font-medium text-[oklch(0.13_0.004_260)] transition hover:bg-[oklch(0.88_0.10_84)] disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
