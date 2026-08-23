"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { SHORTCUTS } from "@/lib/constants";

/**
 * ShortcutsOverlay — a beautiful full-screen shortcut reference card.
 * Triggered by Ctrl+Shift+/ (or via Settings → Shortcuts).
 *
 * Groups shortcuts by category and renders them in a deep-space grid
 * with gold kbd chips. This is the canonical reference for the Lumen
 * keyboard-first UX.
 */
export function ShortcutsOverlay() {
  const s = useStore();

  const groups = SHORTCUTS.reduce((acc, sc) => {
    (acc[sc.group] ??= []).push(sc);
    return acc;
  }, {} as Record<string, typeof SHORTCUTS[number][]>);

  const groupOrder = ["Core", "Tabs", "History", "Study", "System"];
  const groupIcons: Record<string, string> = {
    Core: "✦",
    Tabs: "▢",
    History: "↻",
    Study: "🎯",
    System: "⚙",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sb-deepspace sb-stars sb-anim-fade absolute inset-0 z-50 flex items-center justify-center p-6"
    >
      <div className="absolute inset-0" onClick={() => s.closeOverlay()} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative z-10 w-full max-w-3xl sb-glass sb-glass-gold rounded-2xl overflow-hidden sb-anim-pop"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-medium text-foreground">
              <span className="sb-text-gold">⌨</span> Keyboard Shortcuts
            </h2>
            <p className="text-[0.7rem] text-muted-foreground">
              Lumen is keyboard-first. Every action is one keystroke away.
            </p>
          </div>
          <button onClick={() => s.closeOverlay()} className="sb-kbd">Esc</button>
        </div>

        {/* Grid of groups */}
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {groupOrder.map((g) => {
            const list = groups[g] ?? [];
            if (list.length === 0) return null;
            return (
              <div key={g}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm sb-text-gold">{groupIcons[g] ?? "•"}</span>
                  <p className="text-xs font-medium uppercase tracking-wider sb-text-gold">{g}</p>
                </div>
                <div className="space-y-0.5">
                  {list.map((sc) => (
                    <div
                      key={sc.label}
                      className="flex items-center justify-between rounded-lg px-3 py-1.5 transition hover:bg-secondary/40"
                    >
                      <span className="text-sm text-muted-foreground">{sc.label}</span>
                      <div className="flex gap-1">
                        {sc.keys.map((k, i) => (
                          <span key={i} className="sb-kbd">{k}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-black/20 px-4 py-2.5">
          <span className="text-[0.65rem] text-muted-foreground">
            Press <span className="sb-kbd">Ctrl</span> <span className="sb-kbd">Shift</span> <span className="sb-kbd">/</span> anywhere to open this card.
          </span>
          <button
            onClick={() => s.setOverlay("settings")}
            className="rounded-md px-2.5 py-1 text-[0.65rem] text-muted-foreground transition hover:text-foreground"
          >
            Customize in Settings →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
