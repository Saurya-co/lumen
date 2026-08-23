"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { PORTAL_MAP } from "@/lib/constants";
import { sanitizeTitle, sanitizeUrl } from "@/lib/sanitize";
import { Kbd } from "@/components/ui/kbd";

/**
 * TabSwitcher — temporary Ctrl+Tab overlay.
 *
 * Behavior:
 *  - Opens via Ctrl+Tab with the current tab highlighted (no switch yet).
 *  - Each additional Tab press (Ctrl held) moves the highlight — preview only.
 *  - Releasing Ctrl commits the highlighted tab and dismisses smoothly.
 *    (Web flow: window keyup. Native/Electron flow: main process sends a
 *    release signal over IPC → store bumps tabSwitchCommitTick.)
 *  - Arrow keys / Enter also work (mouse-free), clicking a row commits.
 *  - Opened without Ctrl held (e.g. from the command palette): Esc closes,
 *    Enter commits, no auto-dismiss.
 *  - Rapid presses never flicker: selection is local state; the tab only
 *    activates on commit.
 */
export function TabSwitcher() {
  const s = useStore();
  const tabs = s.tabs;
  const activeIdx = Math.max(0, tabs.findIndex((t) => t.id === s.activeTabId));
  // Opened via Ctrl+Tab → Ctrl is already held (keydown happened before mount).
  const viaKeyboard = s.tabSwitchViaKeyboard;
  const [ctrlHeld, setCtrlHeld] = useState(viaKeyboard);
  const [selected, setSelectedState] = useState(activeIdx);
  const committedRef = useRef(false);

  // Mirror of `selected` for use inside stable callbacks / listeners
  const selectedRef = useRef(activeIdx);
  const setSelected = useCallback((i: number) => {
    selectedRef.current = i;
    setSelectedState(i);
  }, []);

  const commit = useCallback(
    (index: number) => {
      if (committedRef.current) return;
      committedRef.current = true;
      const t = useStore.getState().tabs[index];
      if (t && t.id !== useStore.getState().activeTabId) useStore.getState().activateTab(t.id);
      useStore.getState().closeOverlay();
    },
    []
  );

  // Track Ctrl release so we commit + dismiss (web keyboard flow only —
  // keyup never reaches this window when focus sits in the native study view;
  // that path arrives via the commit-tick subscription below instead).
  useEffect(() => {
    if (!viaKeyboard) return;
    function up(e: KeyboardEvent) {
      if (e.key === "Control") setCtrlHeld(false);
    }
    window.addEventListener("keyup", up, true);
    return () => window.removeEventListener("keyup", up, true);
  }, [viaKeyboard]);

  // Commit the previewed tab when Ctrl is released
  useEffect(() => {
    if (!viaKeyboard || ctrlHeld || committedRef.current) return;
    committedRef.current = true;
    const st = useStore.getState();
    const t = st.tabs[selectedRef.current];
    if (t && t.id !== st.activeTabId) st.activateTab(t.id);
    const id = setTimeout(() => st.closeOverlay(), 120);
    return () => clearTimeout(id);
  }, [ctrlHeld, viaKeyboard]);

  // Native flow: main-process Ctrl-release signal
  useEffect(() => {
    if (!viaKeyboard) return;
    const unsub = useStore.subscribe((state, prev) => {
      if (state.tabSwitchCommitTick !== prev.tabSwitchCommitTick) {
        setCtrlHeld(false);
      }
    });
    return unsub;
  }, [viaKeyboard]);

  // Preview cycling: repeated Ctrl+Tab in the WEB flow arrives here as real
  // key events; in NATIVE flow they arrive as store ticks (IPC from main).
  const move = useCallback(
    (dir: 1 | -1) => {
      const len = Math.max(1, useStore.getState().tabs.length);
      setSelected((selectedRef.current + dir + len) % len);
    },
    [setSelected]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (useStore.getState().overlay !== "tab-switcher") return;
      // NOTE: Ctrl+Tab cycling is NOT handled here — the global hook (web)
      // and NativeBridge (native) both route it through the store tick
      // above, which is this component's single source of truth.
      if (e.ctrlKey && e.key.toLowerCase() === "tab") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        commit(selectedRef.current);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [move, commit]);

  useEffect(() => {
    const unsub = useStore.subscribe((state, prev) => {
      if (state.tabSwitchTick !== prev.tabSwitchTick && state.tabSwitchTick > 0) {
        const len = Math.max(1, state.tabs.length);
        setSelected((selectedRef.current + state.tabSwitchDir + len) % len);
      }
    });
    return unsub;
  }, [setSelected]);

  // Keep the highlighted row in view
  useEffect(() => {
    document
      .querySelector(`[data-idx="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  // Failsafe: dismiss if the user walks away without committing.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!committedRef.current) useStore.getState().closeOverlay();
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="absolute inset-0 z-40 flex items-start justify-center pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Switch tab"
    >
      <div className="absolute inset-0 bg-black/30" onClick={() => { committedRef.current = true; s.closeOverlay(); }} />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="sb-glass rounded-2xl p-3 sb-anim-pop">
          <p className="mb-2 px-1 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
            {tabs.length} open tab{tabs.length !== 1 ? "s" : ""}
          </p>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto sb-scroll" role="listbox" aria-label="Open tabs">
            {tabs.map((t, i) => {
              const portal = t.portalId ? PORTAL_MAP[t.portalId] : null;
              const isSelected = i === selected;
              const wasActive = t.id === s.activeTabId;
              return (
                <button
                  key={t.id}
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => commit(i)}
                  onMouseEnter={() => setSelected(i)}
                  className={`relative flex w-full items-center gap-3 overflow-hidden rounded-lg py-2 pl-4 pr-3 text-left transition ${
                    isSelected
                      ? "bg-[oklch(0.82_0.12_84)]/10"
                      : "hover:bg-secondary/60"
                  }`}
                >
                  {/* Gold accent bar marks the highlighted row */}
                  <span
                    aria-hidden
                    className={`absolute inset-y-1 left-0 w-[3px] rounded-full bg-[oklch(0.82_0.12_84)] transition-opacity ${
                      isSelected ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[0.6rem] font-bold text-white"
                    style={{ background: portal?.color ?? "rgba(255,255,255,0.08)" }}
                    aria-hidden
                  >
                    {portal?.glyph ?? "▢"}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className={`truncate text-sm ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {sanitizeTitle(t.title) || "New Tab"}
                    </p>
                    <p className="truncate text-[0.65rem] text-muted-foreground/70">
                      {sanitizeUrl(t.url) || "—"}
                    </p>
                  </div>
                  {wasActive && (
                    <span className="shrink-0 rounded-full bg-[oklch(0.82_0.12_84)]/20 px-1.5 py-0.5 text-[0.55rem] font-medium uppercase tracking-wide sb-text-gold">
                      current
                    </span>
                  )}
                  {isSelected && !wasActive && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[oklch(0.82_0.12_84)]" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border px-1 pt-2 text-[0.65rem] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Kbd>Tab</Kbd>/<Kbd>↑↓</Kbd> select
            </span>
            <span className="flex items-center gap-1">
              {ctrlHeld ? (
                "release Ctrl to switch"
              ) : (
                <>
                  <Kbd>↵</Kbd> switch · <Kbd>Esc</Kbd> cancel
                </>
              )}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
