"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { EmptyState } from "./empty-state";

/**
 * HighlightsView — shows all PDF highlights grouped by document.
 *
 * Each group is a document (PDF URL) with its highlight count. Inside
 * each group, highlights are listed chronologically with the highlighted
 * text in a gold-tinted card, optional note, and copy/delete actions.
 *
 * This is the dedicated view for reviewing PDF annotations — separate
 * from the Notes tab (which also stores highlights as notes).
 */
export function HighlightsView() {
  const s = useStore();

  const grouped = useMemo(() => {
    const map = new Map<string, { url: string; title: string; highlights: typeof s.highlights }[]>();
    const groups: { url: string; title: string; highlights: typeof s.highlights }[] = [];
    for (const h of s.highlights) {
      let g = groups.find((x) => x.url === h.pdfUrl);
      if (!g) {
        // Derive a friendly title from the URL
        let title = "Untitled document";
        try {
          const u = new URL(h.pdfUrl);
          title = u.hostname.replace(/^www\./, "") + u.pathname;
        } catch {
          title = h.pdfUrl;
        }
        g = { url: h.pdfUrl, title, highlights: [] };
        groups.push(g);
      }
      g.highlights.push(h);
    }
    // Sort highlights within each group by date desc
    for (const g of groups) {
      g.highlights.sort((a, b) => b.createdAt - a.createdAt);
    }
    // Sort groups by most recent highlight
    groups.sort((a, b) => b.highlights[0]?.createdAt - a.highlights[0]?.createdAt);
    return groups;
  }, [s.highlights]);

  if (s.highlights.length === 0) {
    return (
      <EmptyState
        icon="🖍"
        title="No highlights yet"
        description="Open a PDF in the internal viewer and use the 'Highlight selection' tool to save important passages. They'll appear here, grouped by document."
        hint="Ctrl+K → Open PDF in internal viewer"
        action={{
          label: "Open PDF viewer",
          onClick: () => {
            const url = "/pdf-viewer?title=Sample%20Study%20Document&kind=doc";
            if (s.activeTabId) s.setTabUrl(s.activeTabId, url, "PDF Viewer");
          },
        }}
      />
    );
  }

  const totalHighlights = s.highlights.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground">
        <span className="rounded-full bg-secondary/40 px-2.5 py-0.5">
          <span className="text-foreground font-medium">{totalHighlights}</span> highlight{totalHighlights !== 1 ? "s" : ""}
        </span>
        <span className="rounded-full bg-secondary/40 px-2.5 py-0.5">
          <span className="text-foreground font-medium">{grouped.length}</span> document{grouped.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Groups */}
      {grouped.map((g, gi) => (
        <motion.div
          key={g.url}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.05 }}
          className="rounded-xl border border-border bg-secondary/20 p-3"
        >
          {/* Document header */}
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm">📄</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{g.title}</p>
              <p className="text-[0.6rem] text-muted-foreground">
                {g.highlights.length} highlight{g.highlights.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => { s.newTab(g.url, g.title); s.closeOverlay(); }}
              className="rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-[0.6rem] text-foreground transition hover:bg-secondary"
            >
              Open
            </button>
          </div>

          {/* Highlights */}
          <div className="space-y-2">
            {g.highlights.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: gi * 0.05 + i * 0.03 }}
                className="group rounded-lg border-l-2 border-[oklch(0.82_0.12_84)]/40 bg-[oklch(0.82_0.12_84)]/5 p-2.5"
              >
                {/* Highlighted text */}
                <p className="text-sm leading-relaxed text-foreground italic">"{h.text}"</p>
                {/* Optional note */}
                {h.note && (
                  <p className="mt-1.5 text-[0.7rem] text-muted-foreground">📝 {h.note}</p>
                )}
                {/* Footer */}
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[0.55rem] text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                  <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => navigator.clipboard?.writeText(h.text)}
                      className="text-[0.6rem] text-muted-foreground hover:text-foreground"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => s.removeHighlight(h.id)}
                      className="text-[0.6rem] text-muted-foreground hover:text-foreground"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
