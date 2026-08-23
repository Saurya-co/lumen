"use client";

import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
}

/**
 * EmptyState — a polished, deep-space empty placeholder for Library tabs,
 * AI history, etc. Follows the Lumen visual language: glass card, gold
 * accent, subtle starfield.
 */
export function EmptyState({ icon, title, description, hint, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="col-span-full flex flex-col items-center justify-center py-12"
    >
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl sb-glass sb-glass-gold">
        <span className="text-2xl opacity-90">{icon}</span>
        <div className="absolute -inset-1 -z-10 rounded-2xl bg-[oklch(0.82_0.12_84)]/10 blur-lg" />
      </div>
      <p className="mb-1 text-sm font-medium text-foreground">{title}</p>
      <p className="mb-3 max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {hint && (
        <div className="mb-3 flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[0.65rem] text-muted-foreground">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="sb-text-gold">
            <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor" />
          </svg>
          {hint}
        </div>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-md bg-[oklch(0.82_0.12_84)] px-3 py-1.5 text-xs font-medium text-[oklch(0.13_0.004_260)] transition hover:bg-[oklch(0.88_0.10_84)]"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
