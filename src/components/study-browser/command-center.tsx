"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { PORTAL_MAP, SHORTCUTS } from "@/lib/constants";
import { importPdf } from "@/lib/pdf-import";
import { sanitizeTitle } from "@/lib/sanitize";
import { Kbd } from "@/components/ui/kbd";
import type { CommandAction, CommandContext } from "@/lib/types";

/**
 * CommandCenter — the Ctrl+K palette.
 *
 * PERF: subscribes narrowly to the data slices it renders. Zustand action
 * references are stable, so they're read once via getState() and never
 * cause re-subscriptions. The heavy `actions` memo rebuilds only when one
 * of its true inputs changes — not on unrelated store writes.
 */
export function CommandCenter() {
  // ---- Reactive data (narrow selectors) --------------------------------
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const closedTabs = useStore((s) => s.closedTabs);
  const library = useStore((s) => s.library);
  const recentCommands = useStore((s) => s.recentCommands);
  const focusSessions = useStore((s) => s.focusSessions);
  const focusActive = useStore((s) => s.focusActive);
  const tabsPaused = useStore((s) => s.tabsPaused);

  // ---- Stable actions ----------------------------------------------------
  const {
    newTab, closeTab, reopenClosedTab, activateTab, updateTab,
    goBack, goForward, reloadTab,
    setOverlay, closeOverlay, startFocus, endFocus,
    addToLibrary, visitLibraryItem, recordCommand, toggleTabsPaused,
  } = useStore.getState();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Determine current context based on active tab
  const context: CommandContext = useMemo(() => {
    if (!activeTab?.url) return "any";
    const url = activeTab.url.toLowerCase();
    if (url.includes("youtube") || url.includes("youtu.be")) return "youtube";
    if (url.endsWith(".pdf") || url.includes("/pdf/") || url.includes("/pdf-viewer")) return "pdf";
    if (url.includes("/study-surface")) return "lecture";
    if (activeTab.portalId === "pw" || activeTab.portalId === "unacademy" || activeTab.portalId === "nptel") return "lecture";
    return "webpage";
  }, [activeTab]);

  const actions = useMemo<CommandAction[]>(() => {
    const base: CommandAction[] = [
      {
        id: "new-tab",
        label: "New tab",
        shortcut: ["Ctrl", "T"],
        context: "any",
        group: "tab",
        icon: "＋",
        run: () => { newTab(); setOverlay("navigate"); },
      },
      {
        id: "close-tab",
        label: "Close current tab",
        shortcut: ["Ctrl", "W"],
        context: "any",
        group: "tab",
        icon: "✕",
        run: () => activeTabId && closeTab(activeTabId),
      },
      {
        id: "reopen-tab",
        label: "Reopen closed tab",
        shortcut: ["Ctrl", "Shift", "T"],
        context: "any",
        group: "tab",
        icon: "↺",
        run: () => reopenClosedTab(),
      },
      {
        id: "navigate",
        label: "Navigate / search URL",
        shortcut: ["Ctrl", "L"],
        context: "any",
        group: "navigate",
        icon: "→",
        run: () => setOverlay("navigate"),
      },
      {
        id: "switch-tab",
        label: "Switch tab",
        shortcut: ["Ctrl", "Tab"],
        context: "any",
        group: "tab",
        icon: "⇄",
        run: () => useStore.getState().openTabSwitcher(false),
      },
      {
        id: "back",
        label: "Go back",
        shortcut: ["Alt", "←"],
        context: "any",
        group: "navigate",
        icon: "←",
        run: () => goBack(),
      },
      {
        id: "forward",
        label: "Go forward",
        shortcut: ["Alt", "→"],
        context: "any",
        group: "navigate",
        icon: "→",
        run: () => goForward(),
      },
      {
        id: "reload",
        label: "Reload page",
        shortcut: ["Ctrl", "R"],
        context: "any",
        group: "navigate",
        icon: "↻",
        run: () => reloadTab(),
      },
      {
        id: "find",
        label: "Find in page",
        shortcut: ["Ctrl", "F"],
        context: "any",
        group: "navigate",
        icon: "⌕",
        run: () => setOverlay("find"),
      },
      {
        id: "quick-note",
        label: "Quick Note",
        shortcut: ["Ctrl", "Shift", "N"],
        context: "any",
        group: "note",
        icon: "📝",
        run: () => setOverlay("quick-note"),
      },
      {
        id: "focus-start",
        label: "Start focus session",
        shortcut: ["Ctrl", "Shift", "F"],
        context: "any",
        group: "focus",
        icon: "⏱",
        run: () => startFocus(),
      },
      {
        id: "focus-presets",
        label: "Start focus with preset",
        context: "any",
        group: "focus",
        icon: "🎯",
        keywords: ["quick", "deep work", "exam", "pomodoro", "template"],
        run: () => setOverlay("focus-presets"),
      },
      ...(focusActive
        ? [
            {
              id: "focus-end",
              label: "End focus session",
              context: "any" as const,
              group: "focus" as const,
              icon: "⏹",
              run: () => endFocus(true),
            },
          ]
        : []),
      {
        id: "focus-reopen",
        label: "Reopen last focus session",
        context: "any",
        group: "focus",
        icon: "↻",
        keywords: ["restart", "repeat", "last", "resume"],
        run: () => {
          const last = focusSessions.find((f) => f.completed);
          if (last?.url) {
            newTab(last.url, last.tabTitle);
          }
          startFocus(last ? last.durationSec : undefined);
        },
      },
      {
        id: "library",
        label: "Open Study Library",
        shortcut: ["Ctrl", "Shift", "L"],
        context: "any",
        group: "system",
        icon: "📚",
        run: () => setOverlay("library"),
      },
      {
        id: "ai-ask",
        label: "Ask AI assistant",
        context: "any",
        group: "ai",
        icon: "✨",
        keywords: ["summarize", "explain", "simplify"],
        run: () => setOverlay("ai", { text: "", action: "ask" }),
      },
      {
        id: "settings",
        label: "Open Settings",
        shortcut: ["Ctrl", ","],
        context: "any",
        group: "system",
        icon: "⚙",
        run: () => setOverlay("settings"),
      },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts reference",
        shortcut: ["Ctrl", "Shift", "/"],
        context: "any",
        group: "system",
        icon: "⌨",
        keywords: ["help", "keyboard", "cheatsheet"],
        run: () => setOverlay("shortcuts"),
      },
      {
        id: "onboarding",
        label: "Replay onboarding tutorial",
        context: "any",
        group: "system",
        icon: "✦",
        keywords: ["tutorial", "welcome", "guide"],
        run: () => setOverlay("onboarding"),
      },
      {
        id: "portal-picker",
        label: "Change study portal",
        context: "any",
        group: "system",
        icon: "🌐",
        keywords: ["website", "portal", "switch site"],
        run: () => setOverlay("portal-picker"),
      },
      {
        id: "pause-tabs",
        label: tabsPaused ? "Resume all tabs" : "Pause all background tabs",
        context: "any",
        group: "system",
        icon: tabsPaused ? "▶" : "⏸",
        keywords: ["suspend", "ram", "cpu", "performance", "freeze"],
        run: () => toggleTabsPaused(),
      },
      {
        id: "open-pdf",
        label: "Import PDF from disk…",
        context: "any",
        group: "system",
        icon: "📄",
        keywords: ["import", "document", "viewer", "reader", "file"],
        shortcut: ["Ctrl", "O"],
        run: () => {
          void importPdf();
        },
      },
    ];

    // Context-aware study actions
    if (context === "lecture" || context === "youtube") {
      base.unshift(
        {
          id: "ctx-focus",
          label: "Focus this lecture",
          context: "lecture",
          group: "study",
          icon: "🎯",
          run: () => startFocus(),
        },
        {
          id: "ctx-note",
          label: "Quick note from this lecture",
          context: "lecture",
          group: "study",
          icon: "📝",
          run: () => setOverlay("quick-note"),
        },
        {
          id: "ctx-save",
          label: "Save lecture position",
          context: "lecture",
          group: "study",
          icon: "📌",
          run: () => {
            if (activeTab) {
              // In the web preview we can't read iframe video currentTime.
              // Use the elapsed time since the tab was created as a proxy
              // for "where the user is in the lecture". The Electron build
              // replaces this with the actual video.currentTime from the
              // preload content script.
              const elapsedSec = Math.min(
                3600,
                Math.floor((Date.now() - activeTab.createdAt) / 1000)
              );
              addToLibrary({
                kind: "lecture",
                title: activeTab.title,
                url: activeTab.url,
                tags: ["lecture"],
                portalId: activeTab.portalId,
                position: {
                  videoTimeSec: elapsedSec,
                  scrollRatio: 0.4,
                },
              });
              recordCommand("ctx-save", "Save lecture position");
            }
          },
        },
        {
          id: "ctx-mark",
          label: "Mark lecture complete",
          context: "lecture",
          group: "study",
          icon: "✓",
          run: () => {
            if (activeTab) updateTab(activeTab.id, { title: sanitizeTitle(activeTab.title + " ✓") });
          },
        },
        {
          id: "ctx-ask",
          label: "Ask AI about this lecture",
          context: "lecture",
          group: "ai",
          icon: "✨",
          run: () => setOverlay("ai", { text: "", action: "ask" }),
        },
      );
    }
    if (context === "pdf") {
      base.unshift(
        {
          id: "ctx-pdf-explain",
          label: "Explain this PDF",
          context: "pdf",
          group: "ai",
          icon: "✨",
          run: () => setOverlay("ai", { text: `Explain the key concepts in "${sanitizeTitle(activeTab?.title) ?? "this PDF"}"`, action: "explain" }),
        },
        {
          id: "ctx-pdf-summarize",
          label: "Summarize this PDF",
          context: "pdf",
          group: "ai",
          icon: "📝",
          run: () => setOverlay("ai", { text: sanitizeTitle(activeTab?.title) ?? "this PDF", action: "summarize" }),
        },
        {
          id: "ctx-pdf-highlight",
          label: "Highlight selection (Quick Note)",
          context: "pdf",
          group: "study",
          icon: "🖍",
          run: () => setOverlay("quick-note"),
        },
        {
          id: "ctx-pdf-annotate",
          label: "Annotate this PDF",
          context: "pdf",
          group: "study",
          icon: "✎",
          run: () => setOverlay("quick-note"),
        },
        {
          id: "ctx-pdf-library",
          label: "Add PDF to Library",
          context: "pdf",
          group: "study",
          icon: "📚",
          run: () => {
            if (activeTab) addToLibrary({ kind: "pdf", title: activeTab.title, url: activeTab.url, tags: ["pdf"], portalId: activeTab.portalId });
          },
        },
        {
          id: "ctx-pdf-ask",
          label: "Ask AI about this PDF",
          context: "pdf",
          group: "ai",
          icon: "✨",
          run: () => setOverlay("ai", { text: "", action: "ask" }),
        },
      );
    }
    if (context === "webpage") {
      base.unshift(
        {
          id: "ctx-summarize",
          label: "Summarize this page",
          context: "webpage",
          group: "ai",
          icon: "✨",
          run: () => setOverlay("ai", { text: sanitizeTitle(activeTab?.title) ?? "", action: "summarize" }),
        },
        {
          id: "ctx-research",
          label: "Save research note",
          context: "webpage",
          group: "study",
          icon: "🔬",
          run: () => setOverlay("quick-note"),
        },
        {
          id: "ctx-bookmark",
          label: "Smart bookmark this page",
          context: "webpage",
          group: "study",
          icon: "★",
          run: () => {
            if (activeTab) addToLibrary({ kind: "bookmark", title: activeTab.title, url: activeTab.url, tags: ["bookmark"], portalId: activeTab.portalId });
          },
        },
        {
          id: "ctx-ask-web",
          label: "Ask AI about this page",
          context: "webpage",
          group: "ai",
          icon: "✨",
          run: () => setOverlay("ai", { text: "", action: "ask" }),
        },
      );
    }

    // Add tab switching as commands
    tabs.forEach((t) => {
      base.push({
        id: `tab-${t.id}`,
        label: `Switch to: ${t.title}`,
        context: "any",
        group: "tab",
        icon: "▢",
        keywords: [t.url, t.title],
        run: () => activateTab(t.id),
      });
    });

    // Add recently closed tabs as reopen commands
    closedTabs.slice(0, 5).forEach((t) => {
      base.push({
        id: `closed-${t.id}`,
        label: `Reopen closed: ${t.title || "Untitled"}`,
        context: "any",
        group: "tab",
        icon: "↺",
        keywords: [t.url, t.title, "reopen", "recently closed"],
        run: () => reopenClosedTab(),
      });
    });

    // Add library items (bookmarks / lectures / PDFs) as quick-open commands
    library.slice(0, 12).forEach((l) => {
      const icon = l.kind === "bookmark" ? "★" : l.kind === "pdf" ? "📄" : l.kind === "lecture" ? "🎬" : "📝";
      base.push({
        id: `lib-${l.id}`,
        label: `${l.kind === "bookmark" ? "Open" : l.kind === "pdf" ? "Open PDF" : l.kind === "lecture" ? "Resume" : "Open"}: ${l.title}`,
        context: "any",
        group: "system",
        icon,
        keywords: [l.title, l.url ?? "", l.kind, "library", ...(l.tags ?? [])],
        run: () => {
          if (l.url) {
            newTab(l.url, l.title, l.portalId);
            visitLibraryItem(l.id);
            closeOverlay();
          }
        },
      });
    });

    return base;
    // Rebuilds only when a true input changes — NOT on unrelated store writes.
  }, [
    context, activeTab, tabs, closedTabs, library, focusSessions,
    focusActive, tabsPaused, activeTabId,
    newTab, closeTab, reopenClosedTab, activateTab, updateTab,
    goBack, goForward, reloadTab, setOverlay, closeOverlay,
    startFocus, endFocus, addToLibrary, visitLibraryItem, recordCommand, toggleTabsPaused,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions
      .map((a) => {
        const hay = [a.label, ...(a.keywords ?? []), a.group].join(" ").toLowerCase();
        const score = fuzzyScore(hay, q);
        return score > 0 ? { a, score } : null;
      })
      .filter((x): x is { a: CommandAction; score: number } => x !== null)
      .sort((x, y) => y.score - x.score)
      .map((x) => x.a);
  }, [actions, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function run(a: CommandAction) {
    recordCommand(a.id, a.label);
    a.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) run(filtered[active]);
    }
  }

  // Group actions for display
  const grouped = useMemo(() => {
    const g: Record<string, CommandAction[]> = {};
    filtered.forEach((a) => {
      (g[a.group] ??= []).push(a);
    });
    // Context-relevant groups first, then navigation/system
    const order = ["ai", "study", "note", "focus", "navigate", "tab", "system"];
    return order.filter((k) => g[k]).map((k) => ({ group: k, items: g[k] }));
  }, [filtered]);

  // Flat index map for keyboard navigation across groups
  const flat = grouped.flatMap((g) => g.items);

  // Keep the active row visible during keyboard navigation
  const activeId = flat[active]?.id;
  useEffect(() => {
    if (!activeId) return;
    resultsRef.current
      ?.querySelector(`[data-cmd="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="sb-deepspace sb-anim-fade absolute inset-0 z-50 flex items-start justify-center pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Study command center"
    >
      <div className="absolute inset-0" onClick={closeOverlay} />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.12 }}
        className="relative z-10 w-full max-w-xl px-4"
      >
        <div className="sb-glass sb-glass-gold rounded-2xl overflow-hidden sb-anim-pop">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="sb-text-gold">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0); // reset selection whenever the query changes
              }}
              onKeyDown={onKeyDown}
              placeholder="Search commands, tabs, study actions…"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-center-results"
              aria-activedescendant={activeId ? `cmd-${activeId}` : undefined}
              aria-label="Search commands"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            <Kbd>Esc</Kbd>
          </div>

          {/* Results */}
          <div
            id="command-center-results"
            ref={resultsRef}
            role="listbox"
            aria-label="Commands"
            className="max-h-[min(56vh,480px)] overflow-y-auto sb-scroll p-2"
          >
            {/* Open tabs quick-access — horizontal chips, only when no query */}
            {!query && tabs.length > 1 && (
              <div className="mb-3">
                <p className="px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Open tabs
                </p>
                <div className="flex flex-wrap gap-1.5 px-1.5 py-1">
                  {[...tabs]
                    .sort((a, b) => b.lastAccessed - a.lastAccessed)
                    .slice(0, 6)
                    .map((t) => {
                      const isActive = t.id === activeTabId;
                      const portal = t.portalId ? PORTAL_MAP[t.portalId] : null;
                      return (
                        <button
                          key={t.id}
                          onClick={() => { activateTab(t.id); closeOverlay(); }}
                          className={`group flex items-center gap-1.5 rounded-full border px-2 py-1 text-[0.65rem] transition ${
                            isActive
                              ? "border-[oklch(0.82_0.12_84)]/40 bg-[oklch(0.82_0.12_84)]/10 text-foreground"
                              : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                          }`}
                          title={t.url || t.title}
                        >
                          {portal && (
                            <span
                              className="flex h-3.5 w-3.5 items-center justify-center rounded text-[0.45rem] font-bold text-white"
                              style={{ background: portal.color }}
                            >
                              {portal.glyph}
                            </span>
                          )}
                          <span className="max-w-[120px] truncate">{sanitizeTitle(t.title) || "New Tab"}</span>
                          {isActive && (
                            <span className="h-1 w-1 rounded-full bg-[oklch(0.82_0.12_84)]" />
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {!query && recentCommands.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Recent
                </p>
                {recentCommands.slice(0, 3).map((r) => {
                  const act = actions.find((a) => a.id === r.id);
                  if (!act) return null;
                  return (
                    <button
                      key={r.id}
                      onClick={() => run(act)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-secondary"
                    >
                      <span className="opacity-70">{act.icon}</span>
                      <span className="flex-1">{act.label}</span>
                      <span className="text-[0.65rem] text-muted-foreground/60">{timeAgo(r.timestamp)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {flat.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="text-muted-foreground/40">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-sm text-muted-foreground">No commands match &ldquo;{query}&rdquo;</p>
                <button
                  onClick={() => setQuery("")}
                  className="text-xs text-muted-foreground/60 underline-offset-2 transition hover:text-foreground hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}

            {grouped.map((g) => (
              <div key={g.group} className="mb-1">
                <p className="px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
                  {groupLabel(g.group)}
                </p>
                {g.items.map((a) => {
                  const idx = flat.findIndex((x) => x.id === a.id);
                  const isActive = idx === active;
                  return (
                    <button
                      key={a.id}
                      id={`cmd-${a.id}`}
                      data-cmd={a.id}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => run(a)}
                      onMouseEnter={() => setActive(idx)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-[oklch(0.82_0.12_84)]/15 text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xs" aria-hidden>
                        {a.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{a.label}</span>
                      {a.context !== "any" && (
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
                          {a.context}
                        </span>
                      )}
                      {a.shortcut && (
                        <div className="flex shrink-0 gap-1">
                          {a.shortcut.map((k, i) => (
                            <Kbd key={i}>{k}</Kbd>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer — shortcut hints */}
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[0.65rem] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Kbd>↑↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd> run
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Esc</Kbd> close
              </span>
            </div>
            <span className="sb-text-gold font-medium">
              {context === "any" ? "Command Center" : `Context: ${context}`}
            </span>
          </div>
        </div>

        {/* Hint: shortcut list */}
        {!query && (
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.65rem] text-muted-foreground/60">
            {SHORTCUTS.slice(0, 6).map((sc) => (
              <span key={sc.label} className="flex items-center gap-1">
                {sc.keys.map((k, i) => (
                  <Kbd key={i}>{k}</Kbd>
                ))}
                <span>{sc.label}</span>
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function groupLabel(g: string): string {
  switch (g) {
    case "ai": return "AI Assistant";
    case "study": return "Study Actions";
    case "note": return "Notes";
    case "focus": return "Focus";
    case "navigate": return "Navigation";
    case "tab": return "Tabs";
    case "system": return "System";
    default: return g;
  }
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Lightweight fuzzy scorer. Returns a positive score when all query
 * characters appear in order inside `hay` (subsequence match), 0 otherwise.
 * Rewards: substring hits, word-boundary hits, tight character grouping.
 */
function fuzzyScore(hay: string, q: string): number {
  const idx = hay.indexOf(q);
  if (idx === 0) return 1000; // exact prefix — best match
  if (idx > 0) return 800 - Math.min(idx, 200); // substring

  let score = 0;
  let hi = 0;
  let streak = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    if (c === " ") continue;
    const found = hay.indexOf(c, hi);
    if (found === -1) return 0; // not a subsequence
    // Word boundary bonus
    if (found === 0 || hay[found - 1] === " " || hay[found - 1] === "-") score += 8;
    // Consecutive characters are likely the intended word
    streak = found === hi ? streak + 1 : 0;
    score += 4 + streak * 2 - Math.min(found - hi, 20);
    hi = found + 1;
  }
  return score;
}
