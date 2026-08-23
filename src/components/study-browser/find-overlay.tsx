"use client";

import { motion } from "framer-motion";
import { useStore } from "@/lib/store";

export function FindOverlay() {
  const s = useStore();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.12 }}
      className="absolute inset-x-0 top-0 z-40 flex justify-center"
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Find in page"
        className="sb-glass sb-glass-gold m-3 w-full max-w-lg rounded-xl px-3 py-2 sb-anim-slide-down"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="sb-text-gold">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            autoFocus
            value={s.findQuery}
            onChange={(e) => useStore.setState({ findQuery: e.target.value })}
            onKeyDown={(e) => e.key === "Escape" && s.closeOverlay()}
            placeholder="Find in page (native browser Ctrl+F works inside study sites)"
            aria-label="Find in page"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <span className="sb-kbd">Esc</span>
        </div>
        <p className="mt-1 text-[0.65rem] text-muted-foreground">
          Tip: in the packaged Lumen app, Ctrl+F triggers the native in-page finder inside the study website.
        </p>
      </div>
    </motion.div>
  );
}
