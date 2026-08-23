"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { EmptyState } from "./empty-state";

/**
 * SubjectsView — groups all library items + notes by workspace (subject).
 *
 * Shows per-subject stats (notes count, bookmarks, lectures, PDFs, focus
 * minutes) and a horizontal progress bar showing the subject's share of
 * total study time. Clicking a subject card opens a filtered view of that
 * subject's items.
 *
 * Unassigned items appear under an "Unassigned" group at the bottom.
 */
export function SubjectsView() {
  const s = useStore();
  const [selectedWs, setSelectedWs] = useSelectedWs();

  // Compute per-workspace stats
  const subjects = useMemo(() => {
    const map = new Map<string, {
      id: string | null;
      name: string;
      color: string;
      notes: number;
      bookmarks: number;
      lectures: number;
      pdfs: number;
      focusMin: number;
      items: { id: string; kind: string; title: string; url?: string; ts: number }[];
    }>();

    // Helper to get or create a subject
    function getSubject(wsId: string | null) {
      if (map.has(wsId ?? "unassigned")) return map.get(wsId ?? "unassigned")!;
      let name = "Unassigned";
      let color = "#a16207";
      if (wsId) {
        const ws = s.workspaces.find((w) => w.id === wsId);
        if (ws) {
          name = ws.name;
          color = ws.color;
        }
      }
      const sub = {
        id: wsId,
        name,
        color,
        notes: 0,
        bookmarks: 0,
        lectures: 0,
        pdfs: 0,
        focusMin: 0,
        items: [] as { id: string; kind: string; title: string; url?: string; ts: number }[],
      };
      map.set(wsId ?? "unassigned", sub);
      return sub;
    }

    // Library items
    for (const l of s.library) {
      const sub = getSubject(l.workspaceId ?? null);
      sub.items.push({ id: l.id, kind: l.kind, title: l.title, url: l.url, ts: l.updatedAt });
      if (l.kind === "bookmark") sub.bookmarks++;
      else if (l.kind === "lecture") sub.lectures++;
      else if (l.kind === "pdf") sub.pdfs++;
      else if (l.kind === "note") sub.notes++;
    }
    // Notes
    for (const n of s.notes) {
      const sub = getSubject(n.workspaceId ?? null);
      sub.notes++;
      sub.items.push({ id: n.id, kind: "note", title: n.text.slice(0, 60), url: n.url, ts: n.createdAt });
    }
    // Focus sessions — attribute by tab's workspaceId at session time
    // (we don't store workspaceId on sessions, so attribute by URL match
    // against library items' URLs in the same workspace)
    const urlToWs = new Map<string, string | null>();
    for (const l of s.library) {
      if (l.url) urlToWs.set(l.url, l.workspaceId ?? null);
    }
    for (const f of s.focusSessions) {
      const wsId = f.url ? (urlToWs.get(f.url) ?? null) : null;
      const sub = getSubject(wsId);
      sub.focusMin += Math.floor(f.durationSec / 60);
    }

    // Sort subjects by focusMin desc, then items count
    return Array.from(map.values()).sort((a, b) => b.focusMin - a.focusMin || b.items.length - a.items.length);
  }, [s.library, s.notes, s.workspaces, s.focusSessions]);

  const totalItems = s.library.length + s.notes.length;
  const totalFocusMin = s.focusSessions.reduce((acc, f) => acc + Math.floor(f.durationSec / 60), 0);

  if (totalItems === 0 && s.workspaces.length === 0) {
    return (
      <EmptyState
        icon="🗂"
        title="No subjects yet"
        description="Create a workspace in Settings → Workspaces or via the Library → Workspaces tab to group your study material by subject. Subjects show per-subject stats and study-time share."
        hint="Try: JEE 2025, GATE Prep, Semester 5"
      />
    );
  }

  // If a subject is selected, show its items
  if (selectedWs !== null) {
    const sub = subjects.find((x) => (x.id ?? "unassigned") === selectedWs);
    if (sub) {
      return (
        <div>
          <button
            onClick={() => setSelectedWs(null)}
            className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to subjects
          </button>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-4 w-4 rounded-full" style={{ background: sub.color }} />
            <h3 className="text-sm font-medium text-foreground">{sub.name}</h3>
            <span className="text-[0.65rem] text-muted-foreground">
              {sub.items.length} item{sub.items.length !== 1 ? "s" : ""} · {sub.focusMin}m focus
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sub.items.length === 0 ? (
              <p className="col-span-full py-8 text-center text-xs text-muted-foreground">No items in this subject yet.</p>
            ) : (
              sub.items
                .sort((a, b) => b.ts - a.ts)
                .map((it) => (
                  <div key={`${it.kind}-${it.id}`} className="group rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs">
                        {it.kind === "bookmark" ? "★" : it.kind === "pdf" ? "📄" : it.kind === "lecture" ? "🎬" : "📝"}
                      </span>
                      <span className="text-[0.55rem] uppercase tracking-wide text-muted-foreground">{it.kind}</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{it.title}</p>
                    {it.url && <p className="mt-1 truncate text-[0.6rem] text-muted-foreground">{it.url}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[0.55rem] text-muted-foreground">{new Date(it.ts).toLocaleDateString()}</span>
                      {it.url && (
                        <button
                          onClick={() => { s.newTab(it.url!, it.title); s.closeOverlay(); }}
                          className="text-[0.65rem] sb-text-gold opacity-0 transition group-hover:opacity-100 hover:underline"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground">
        <span className="rounded-full bg-secondary/40 px-2.5 py-0.5">
          <span className="text-foreground font-medium">{subjects.length}</span> subject{subjects.length !== 1 ? "s" : ""}
        </span>
        <span className="rounded-full bg-secondary/40 px-2.5 py-0.5">
          <span className="text-foreground font-medium">{totalItems}</span> total items
        </span>
        <span className="rounded-full bg-secondary/40 px-2.5 py-0.5">
          <span className="text-foreground font-medium">{totalFocusMin}m</span> total focus
        </span>
      </div>

      {/* Subject cards */}
      {subjects.map((sub, i) => {
        const sharePct = totalFocusMin > 0 ? Math.round((sub.focusMin / totalFocusMin) * 100) : 0;
        return (
          <motion.button
            key={sub.id ?? "unassigned"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedWs(sub.id ?? "unassigned")}
            className="group w-full text-left rounded-xl border border-border bg-secondary/30 p-4 transition hover:bg-secondary/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-4 rounded-full" style={{ background: sub.color }} />
                <div>
                  <p className="text-sm font-medium text-foreground">{sub.name}</p>
                  <p className="text-[0.6rem] text-muted-foreground">
                    {sub.items.length} item{sub.items.length !== 1 ? "s" : ""} · {sub.focusMin}m focus
                    {sharePct > 0 && ` · ${sharePct}% of total`}
                  </p>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted-foreground opacity-0 transition group-hover:opacity-100">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {/* Item type breakdown */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sub.notes > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.55rem] text-muted-foreground">📝 {sub.notes} notes</span>
              )}
              {sub.bookmarks > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.55rem] text-muted-foreground">★ {sub.bookmarks} bookmarks</span>
              )}
              {sub.lectures > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.55rem] text-muted-foreground">🎬 {sub.lectures} lectures</span>
              )}
              {sub.pdfs > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.55rem] text-muted-foreground">📄 {sub.pdfs} PDFs</span>
              )}
            </div>
            {/* Focus share bar */}
            {totalFocusMin > 0 && (
              <div className="mt-3">
                <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sharePct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="h-full rounded-full"
                    style={{ background: sub.color }}
                  />
                </div>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// Tiny helper hook for the selected workspace state
import { useState } from "react";
function useSelectedWs() {
  const [v, setV] = useState<string | null>(null);
  return [v, setV] as const;
}
