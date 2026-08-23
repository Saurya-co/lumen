"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { STUDY_PORTALS } from "@/lib/constants";
import { sbToast } from "@/lib/toast";
import { sanitizeUrl, sanitizeText } from "@/lib/sanitize";
import { Kbd } from "@/components/ui/kbd";

function isProbablyUrl(s: string): boolean {
  const v = s.trim();
  if (!v) return false;
  if (/\s/.test(v)) return false; // has spaces -> search
  if (/^https?:\/\//i.test(v)) return true;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(v)) return true;
  if (v.startsWith("/")) return true; // internal route
  if (/^localhost(:\d+)?/i.test(v)) return true;
  return false;
}

/** Returns a navigable URL, or null when the input looks like a URL but is malformed. */
function toUrl(s: string): string | null {
  const v = s.trim();
  if (!v) return null;
  if (v.startsWith("/")) return v;
  const candidate = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(candidate);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return candidate;
  } catch {
    return null;
  }
}

function searchUrl(q: string): string {
  return `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
}

export function NavigateOverlay() {
  const s = useStore();
  const activeTab = s.tabs.find((t) => t.id === s.activeTabId);
  // Current URL is pre-selected so typing replaces it, arrow keys edit it.
  const [q, setQ] = useState(() => sanitizeUrl(activeTab?.url) ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const mode: "url" | "search" | "empty" = !q.trim()
    ? "empty"
    : isProbablyUrl(q)
      ? "url"
      : "search";

  function submit() {
    const v = sanitizeText(q.trim(), 2048);
    if (!v) { s.closeOverlay(); return; }

    let url: string | null = null;
    if (isProbablyUrl(v)) {
      url = toUrl(v);
      if (!url) {
        sbToast.info("Invalid URL", `"${v}" doesn't look like a valid address — try a web search instead.`);
        return;
      }
    } else {
      url = searchUrl(v);
    }

    const tabId = s.activeTabId;
    if (tabId) s.setTabUrl(tabId, url, hostnameOf(url));
    s.closeOverlay();
  }

  const suggestions: { label: string; url: string }[] = [];
  if (!q) {
    STUDY_PORTALS.forEach((p) => {
      if (p.url) suggestions.push({ label: p.name, url: p.url });
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="sb-deepspace sb-anim-fade absolute inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Navigate or search"
    >
      <div className="absolute inset-0" onClick={() => s.closeOverlay()} />
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative z-10 mx-auto mt-[10vh] w-full max-w-2xl px-4"
      >
        <div className="sb-glass sb-glass-gold rounded-2xl overflow-hidden sb-anim-slide-down">
          <div className="flex items-center gap-3 px-4 py-3.5">
            {mode === "search" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="text-muted-foreground">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="sb-text-gold">
                <path d="M3 12l7-7v4h11v6H10v4l-7-7z" fill="currentColor" />
              </svg>
            )}
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); submit(); }
              }}
              aria-label="Search or enter URL"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            {/* Mode chip — visually distinguishes URL navigation from search */}
            {mode !== "empty" && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[0.55rem] font-medium uppercase tracking-wider ${
                  mode === "url"
                    ? "bg-[oklch(0.82_0.12_84)]/15 sb-text-gold"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {mode === "url" ? "Go to URL" : "Web search"}
              </span>
            )}
            <Kbd>Esc</Kbd>
          </div>

          {suggestions.length > 0 && (
            <div className="border-t border-border p-2">
              <p className="px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
                Quick open
              </p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {suggestions.map((su) => {
                  const portal = STUDY_PORTALS.find((p) => p.url === su.url);
                  return (
                    <button
                      key={su.url}
                      onClick={() => {
                        if (s.activeTabId) s.setTabUrl(s.activeTabId, su.url, su.label);
                        if (portal && s.activeTabId) s.updateTab(s.activeTabId, { portalId: portal.id });
                        s.closeOverlay();
                      }}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
                    >
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded text-[0.55rem] font-bold text-white"
                        style={{ background: portal?.color ?? "#a16207" }}
                        aria-hidden
                      >
                        {portal?.glyph ?? "↗"}
                      </div>
                      <span className="truncate">{su.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {q.trim() && (
            <div className="border-t border-border p-2">
              <button
                onClick={submit}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-secondary/60"
              >
                {mode === "url" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="sb-text-gold">
                    <path d="M3 12l7-7v4h11v6H10v4l-7-7z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-muted-foreground">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
                <span className="min-w-0 flex-1 truncate">
                  {mode === "url"
                    ? `Open ${toUrl(q) ?? q}`
                    : `Search the web for "${q.trim()}"`}
                </span>
                <Kbd>↵</Kbd>
              </button>
            </div>
          )}
        </div>

        {/* Hint */}
        <div className="mt-3 flex justify-center gap-3 text-[0.65rem] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
            command center
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>T</Kbd>
            new tab
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function hostnameOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
