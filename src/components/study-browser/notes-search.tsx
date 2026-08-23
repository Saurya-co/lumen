"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { EmptyState } from "./empty-state";
import { NotesTimeline } from "./notes-timeline";
import type { QuickNote } from "@/lib/types";

/**
 * NotesSearch — full-text search across all notes, with a toggle to switch
 * to a chronological Timeline view.
 *
 * Search mode: searches the full note text AND linked tab title/url AND
 * tags. Shows match snippets with highlighted terms. Supports sorting by
 * date (default) or relevance (match count).
 *
 * Timeline mode: vertical timeline grouped by day with gold spine.
 *
 * Keyboard: ↑↓ to navigate results, Enter to open the note's source URL.
 */
export function NotesSearch({ notes }: { notes: QuickNote[] }) {
  const s = useStore();
  const [view, setView] = useState<"search" | "timeline">("search");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"date" | "relevance">("date");
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) {
      return notes.slice().sort((a, b) => b.createdAt - a.createdAt).map((n) => ({ note: n, score: 0, snippet: n.text }));
    }
    const matches = notes
      .map((n) => {
        const text = n.text.toLowerCase();
        const tabTitle = (n.tabTitle ?? "").toLowerCase();
        const tags = (n.tags ?? []).join(" ").toLowerCase();
        const hay = `${text} ${tabTitle} ${tags}`;
        if (!hay.includes(ql)) return null;
        // Score: count of occurrences in text
        let score = 0;
        let idx = text.indexOf(ql);
        while (idx !== -1) {
          score++;
          idx = text.indexOf(ql, idx + 1);
        }
        // Bonus for tag match
        if (tags.includes(ql)) score += 3;
        // Build snippet: 40 chars around first match
        const firstMatch = text.indexOf(ql);
        const start = Math.max(0, firstMatch - 40);
        const end = Math.min(n.text.length, firstMatch + ql.length + 80);
        let snippet = n.text.slice(start, end);
        if (start > 0) snippet = "…" + snippet;
        if (end < n.text.length) snippet = snippet + "…";
        return { note: n, score, snippet };
      })
      .filter((x): x is { note: QuickNote; score: number; snippet: string } => x !== null);

    if (sort === "relevance") {
      matches.sort((a, b) => b.score - a.score || b.note.createdAt - a.note.createdAt);
    } else {
      matches.sort((a, b) => b.note.createdAt - a.note.createdAt);
    }
    return matches;
  }, [notes, q, sort]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]?.note.url) {
      e.preventDefault();
      s.newTab(results[cursor].note.url!, results[cursor].note.tabTitle ?? "Note source");
      s.closeOverlay();
    }
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title="No notes yet"
        description="Capture a thought instantly with Quick Note — it links to the page you were on automatically. Full-text search and timeline will work once you have notes."
        hint="Ctrl+Shift+N"
        action={{ label: "Quick Note", onClick: () => s.setOverlay("quick-note") }}
      />
    );
  }

  // Timeline view
  if (view === "timeline") {
    return (
      <div>
        {/* View toggle */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-0.5">
            <button
              onClick={() => setView("search")}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[0.65rem] font-medium text-muted-foreground transition hover:text-foreground"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Search
            </button>
            <button
              onClick={() => setView("timeline")}
              className="flex items-center gap-1.5 rounded bg-[oklch(0.82_0.12_84)]/15 px-2.5 py-1 text-[0.65rem] font-medium text-foreground ring-1 ring-[oklch(0.82_0.12_84)]/30"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v20M7 6h10M7 12h10M7 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Timeline
            </button>
          </div>
          <span className="text-[0.65rem] text-muted-foreground">{notes.length} notes</span>
        </div>
        <NotesTimeline notes={notes} />
      </div>
    );
  }

  return (
    <div>
      {/* View toggle */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-0.5">
          <button
            onClick={() => setView("search")}
            className="flex items-center gap-1.5 rounded bg-[oklch(0.82_0.12_84)]/15 px-2.5 py-1 text-[0.65rem] font-medium text-foreground ring-1 ring-[oklch(0.82_0.12_84)]/30"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Search
          </button>
          <button
            onClick={() => setView("timeline")}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[0.65rem] font-medium text-muted-foreground transition hover:text-foreground"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v20M7 6h10M7 12h10M7 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Timeline
          </button>
        </div>
      </div>
      {/* Search bar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setCursor(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search note text, tags, source…"
            className="w-full rounded-lg border border-border bg-background/50 py-1.5 pl-8 pr-3 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)] placeholder:text-muted-foreground/50"
          />
        </div>
        {/* Sort toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-0.5">
          <button
            onClick={() => setSort("date")}
            className={`rounded px-2 py-1 text-[0.65rem] font-medium transition ${
              sort === "date" ? "bg-[oklch(0.82_0.12_84)] text-[oklch(0.13_0.004_260)]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Date
          </button>
          <button
            onClick={() => setSort("relevance")}
            className={`rounded px-2 py-1 text-[0.65rem] font-medium transition ${
              sort === "relevance" ? "bg-[oklch(0.82_0.12_84)] text-[oklch(0.13_0.004_260)]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Relevance
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="mb-2 text-[0.65rem] text-muted-foreground">
        {results.length} note{results.length !== 1 ? "s" : ""}
        {q && ` matching "${q}"`}
        <span className="ml-2 text-muted-foreground/60">
          {sort === "relevance" ? "· sorted by relevance" : "· sorted by date"}
        </span>
      </p>

      {/* Results */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {results.length === 0 && q && (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No notes contain &ldquo;{q}&rdquo;.
          </div>
        )}
        {results.map((r, i) => (
          <motion.div
            key={r.note.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.2) }}
            onMouseEnter={() => setCursor(i)}
            className={`group rounded-lg border p-3 transition ${
              i === cursor
                ? "border-[oklch(0.82_0.12_84)]/40 bg-[oklch(0.82_0.12_84)]/5"
                : "border-border bg-secondary/30 hover:bg-secondary/60"
            }`}
          >
            {/* AI badge */}
            {r.note.tags?.includes("ai") && (
              <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[oklch(0.82_0.12_84)]/15 px-2 py-0.5 text-[0.55rem] font-medium uppercase tracking-wide sb-text-gold">
                ✨ AI generated
              </div>
            )}
            {/* Snippet with highlighting */}
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {q ? highlight(r.snippet, q) : r.note.text.slice(0, 200) + (r.note.text.length > 200 ? "…" : "")}
            </p>
            {/* Source */}
            {r.note.tabTitle && (
              <p className="mt-2 truncate text-[0.6rem] text-muted-foreground">
                <span className="opacity-60">from:</span> {r.note.tabTitle}
              </p>
            )}
            {/* Footer */}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[0.55rem] text-muted-foreground">
                {new Date(r.note.createdAt).toLocaleString()}
                {r.score > 0 && ` · ${r.score} match${r.score !== 1 ? "es" : ""}`}
              </span>
              <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
                {r.note.url && (
                  <button
                    onClick={() => { s.newTab(r.note.url!, r.note.tabTitle ?? "Note source"); s.closeOverlay(); }}
                    className="text-[0.65rem] sb-text-gold hover:underline"
                  >
                    Open source
                  </button>
                )}
                <button
                  onClick={() => s.deleteNote(r.note.id)}
                  className="text-[0.65rem] text-muted-foreground hover:text-foreground"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Keyboard hint */}
      {q && results.length > 0 && (
        <p className="mt-3 text-center text-[0.6rem] text-muted-foreground/60">
          <span className="sb-kbd">↑↓</span> navigate · <span className="sb-kbd">↵</span> open source
        </p>
      )}
    </div>
  );
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded-sm bg-[oklch(0.82_0.12_84)]/30 text-foreground px-0.5">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
