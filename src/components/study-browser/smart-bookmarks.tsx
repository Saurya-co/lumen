"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { PORTAL_MAP, STUDY_PORTALS } from "@/lib/constants";
import type { LibraryItem, StudyPortalId } from "@/lib/types";
import { EmptyState } from "./empty-state";

/**
 * SmartBookmarks — a frecency-based (frequency + recency) bookmark view.
 *
 * Groups bookmarks by portal (PW / Unacademy / NPTEL / YouTube / LMS /
 * Custom / Other) and sorts within each group by frecency score:
 *   score = visitCount * 10 + recencyBonus
 *   recencyBonus = 100 if visited in last hour, 50 if last day, 10 if last week, 0 otherwise
 *
 * Each bookmark card shows title, URL, visit count, last-visited relative
 * time, and a frecency bar. Clicking opens the URL in a new tab and
 * records a visit (incrementing visitCount + lastVisitedAt).
 */
export function SmartBookmarks({ q }: { q: string }) {
  const s = useStore();

  const bookmarks = useMemo(() => {
    const all = s.library.filter((l) => l.kind === "bookmark");
    const filtered = q
      ? all.filter((l) =>
          [l.title, l.url ?? "", ...(l.tags ?? [])].join(" ").toLowerCase().includes(q.toLowerCase())
        )
      : all;
    return filtered;
  }, [s.library, q]);

  // Group by portal
  const groups = useMemo(() => {
    const g: Record<string, { label: string; color: string; glyph: string; items: LibraryItem[] }> = {};
    for (const b of bookmarks) {
      const pid = b.portalId ?? "other";
      const key = pid as string;
      if (!g[key]) {
        if (pid === "other" || !PORTAL_MAP[pid as StudyPortalId]) {
          g[key] = { label: "Other", color: "#a16207", glyph: "★", items: [] };
        } else {
          const p = PORTAL_MAP[pid as StudyPortalId];
          g[key] = { label: p.name, color: p.color, glyph: p.glyph, items: [] };
        }
      }
      g[key].items.push(b);
    }
    // Sort items within each group by frecency
    for (const k of Object.keys(g)) {
      g[k].items.sort((a, b) => frecencyScore(b) - frecencyScore(a));
    }
    // Sort groups by total visits desc
    return Object.entries(g).sort((a, b) => {
      const av = a[1].items.reduce((acc, i) => acc + (i.visitCount ?? 0), 0);
      const bv = b[1].items.reduce((acc, i) => acc + (i.visitCount ?? 0), 0);
      return bv - av;
    });
  }, [bookmarks]);

  if (bookmarks.length === 0) {
    return (
      <EmptyState
        icon="★"
        title={q ? "No bookmarks match your search" : "No bookmarks yet"}
        description={
          q
            ? `Nothing in your bookmarks contains "${q}".`
            : "Mark important pages so you can return to them in one keystroke. Smart bookmarks learn what you visit most and surface them at the top."
        }
        hint={q ? undefined : "Ctrl+K → Smart bookmark this page"}
        action={
          q ? undefined : { label: "Open Command Center", onClick: () => s.setOverlay("command-center") }
        }
      />
    );
  }

  const totalVisits = bookmarks.reduce((acc, b) => acc + (b.visitCount ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground">
        <span className="rounded-full bg-secondary/40 px-2.5 py-0.5">
          <span className="text-foreground font-medium">{bookmarks.length}</span> bookmarks
        </span>
        <span className="rounded-full bg-secondary/40 px-2.5 py-0.5">
          <span className="text-foreground font-medium">{totalVisits}</span> visits
        </span>
        <span className="rounded-full bg-secondary/40 px-2.5 py-0.5">
          <span className="text-foreground font-medium">{groups.length}</span> sources
        </span>
        <span className="ml-auto text-[0.6rem] uppercase tracking-wider sb-text-gold">
          sorted by frecency
        </span>
      </div>

      {/* Groups */}
      {groups.map(([key, group]) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-secondary/20 p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded text-[0.55rem] font-bold text-white"
              style={{ background: group.color }}
            >
              {group.glyph}
            </div>
            <p className="text-xs font-medium text-foreground">{group.label}</p>
            <span className="text-[0.6rem] text-muted-foreground">
              {group.items.length} bookmark{group.items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {group.items.map((b) => (
              <BookmarkCard key={b.id} item={b} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function BookmarkCard({ item }: { item: LibraryItem }) {
  const s = useStore();
  const score = frecencyScore(item);
  const maxScore = 200; // for bar normalization
  const visits = item.visitCount ?? 0;
  const last = item.lastVisitedAt;

  return (
    <div className="group rounded-lg border border-border bg-background/40 p-2.5 transition hover:bg-secondary/40">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
          <p className="truncate text-[0.6rem] text-muted-foreground">{item.url}</p>
        </div>
        {/* Frecency indicator */}
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[0.55rem] tabular-nums text-muted-foreground">
            {visits} visit{visits !== 1 ? "s" : ""}
          </span>
          <div className="h-1 w-12 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-[oklch(0.82_0.12_84)]"
              style={{ width: `${Math.min(100, (score / maxScore) * 100)}%` }}
            />
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[0.55rem] text-muted-foreground">
          {last ? timeAgo(last) : "never visited"}
        </span>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          {item.url && (
            <button
              onClick={() => {
                s.newTab(item.url, item.title, item.portalId);
                s.visitLibraryItem(item.id);
                s.closeOverlay();
              }}
              className="rounded px-1.5 py-0.5 text-[0.6rem] sb-text-gold hover:bg-[oklch(0.82_0.12_84)]/15"
            >
              Open
            </button>
          )}
          <button
            onClick={() => s.removeFromLibrary(item.id)}
            className="rounded px-1.5 py-0.5 text-[0.6rem] text-muted-foreground hover:bg-secondary"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function frecencyScore(item: LibraryItem): number {
  const visits = item.visitCount ?? 0;
  const last = item.lastVisitedAt ?? 0;
  const ageHrs = (Date.now() - last) / 3600000;
  let recencyBonus = 0;
  if (last > 0) {
    if (ageHrs < 1) recencyBonus = 100;
    else if (ageHrs < 24) recencyBonus = 50;
    else if (ageHrs < 168) recencyBonus = 10;
  }
  return visits * 10 + recencyBonus;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
