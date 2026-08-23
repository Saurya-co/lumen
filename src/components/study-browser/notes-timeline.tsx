"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { EmptyState } from "./empty-state";
import type { QuickNote } from "@/lib/types";

/**
 * NotesTimeline — a chronological vertical timeline of all notes.
 *
 * Groups notes by day, renders them as a vertical timeline with a gold
 * spine, day headers, and note cards branching off. Each card shows the
 * time, text, source tab, and AI badge if applicable.
 *
 * This is an alternative view to NotesSearch — both are accessible via
 * a toggle at the top of the Notes tab.
 */
export function NotesTimeline({ notes }: { notes: QuickNote[] }) {
  const s = useStore();
  const [filter, setFilter] = useState<"all" | "ai" | "selection" | "pdf">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notes;
    return notes.filter((n) => n.tags?.includes(filter));
  }, [notes, filter]);

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, QuickNote[]>();
    for (const n of filtered) {
      const key = new Date(n.createdAt).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    // Sort days descending (most recent first)
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (notes.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title="No notes yet"
        description="Capture a thought instantly with Quick Note — it links to the page you were on automatically. Your notes will appear here as a chronological timeline."
        hint="Ctrl+Shift+N"
        action={{ label: "Quick Note", onClick: () => s.setOverlay("quick-note") }}
      />
    );
  }

  return (
    <div>
      {/* Filter chips */}
      <div className="mb-4 flex items-center gap-1.5">
        {([
          ["all", "All", "📝"],
          ["ai", "AI generated", "✨"],
          ["selection", "Selections", "✂"],
          ["pdf", "PDF", "📄"],
        ] as [typeof filter, string, string][]).map(([k, l, icon]) => {
          const count = k === "all" ? notes.length : notes.filter((n) => n.tags?.includes(k)).length;
          if (k !== "all" && count === 0) return null;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-medium transition ${
                filter === k
                  ? "border-[oklch(0.82_0.12_84)]/40 bg-[oklch(0.82_0.12_84)]/10 text-foreground"
                  : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <span>{icon}</span>
              <span>{l}</span>
              <span className="rounded-full bg-secondary px-1.5 text-[0.55rem] tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical spine */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-[oklch(0.82_0.12_84)]/40 via-[oklch(0.82_0.12_84)]/20 to-transparent" />

        <div className="space-y-6">
          {grouped.map(([day, dayNotes], gi) => {
            const dayDate = new Date(day + "T00:00:00");
            const isToday = day === new Date().toISOString().slice(0, 10);
            const isYesterday = day === new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const dayLabel = isToday
              ? "Today"
              : isYesterday
                ? "Yesterday"
                : dayDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: gi * 0.05 }}
              >
                {/* Day header */}
                <div className="relative mb-3 flex items-center gap-3 pl-0">
                  <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[oklch(0.82_0.12_84)] bg-[oklch(0.10_0.005_260)]">
                    <div className="h-2 w-2 rounded-full bg-[oklch(0.82_0.12_84)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{dayLabel}</p>
                    <p className="text-[0.6rem] text-muted-foreground">
                      {dayNotes.length} note{dayNotes.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Notes for this day */}
                <div className="ml-9 space-y-2">
                  {dayNotes
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((n, i) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: gi * 0.05 + i * 0.03 }}
                        className="group relative rounded-lg border border-border bg-secondary/30 p-3 transition hover:bg-secondary/60"
                      >
                        {/* Connector dot */}
                        <div className="absolute -left-6 top-4 h-1.5 w-1.5 rounded-full bg-[oklch(0.82_0.12_84)]/40" />
                        {/* Time */}
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[0.6rem] tabular-nums text-muted-foreground">
                            {new Date(n.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                          {n.tags?.includes("ai") && (
                            <span className="rounded-full bg-[oklch(0.82_0.12_84)]/15 px-1.5 py-0.5 text-[0.5rem] font-medium uppercase tracking-wide sb-text-gold">
                              ✨ AI
                            </span>
                          )}
                        </div>
                        {/* Text */}
                        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{n.text}</p>
                        {/* Source */}
                        {n.tabTitle && (
                          <p className="mt-2 truncate text-[0.6rem] text-muted-foreground">
                            <span className="opacity-60">from:</span> {n.tabTitle}
                          </p>
                        )}
                        {/* Tags */}
                        {n.tags && n.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {n.tags.filter((t) => t !== "ai").map((tag) => (
                              <span key={tag} className="rounded-full bg-secondary px-1.5 py-0.5 text-[0.5rem] text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Hover actions */}
                        <div className="mt-2 flex gap-2 opacity-0 transition group-hover:opacity-100">
                          {n.url && (
                            <button
                              onClick={() => { s.newTab(n.url!, n.tabTitle ?? "Note source"); s.closeOverlay(); }}
                              className="text-[0.65rem] sb-text-gold hover:underline"
                            >
                              Open source
                            </button>
                          )}
                          <button
                            onClick={() => s.deleteNote(n.id)}
                            className="text-[0.65rem] text-muted-foreground hover:text-foreground"
                          >
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
