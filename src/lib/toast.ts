"use client";

import { toast } from "sonner";

/**
 * Lumen toast helpers — small, on-demand confirmations that follow the
 * "Appear → Action → Disappear" rule. Used for save / navigate / focus
 * start-end / error events.
 */

export const sbToast = {
  saved: (label: string) =>
    toast.success("Saved", {
      description: label,
      duration: 2200,
    }),
  noteSaved: () =>
    toast.success("Note saved", {
      description: "Added to your Study Library.",
      duration: 2200,
    }),
  librarySaved: (kind: string) =>
    toast.success(`${kind} added to Library`, {
      description: "Find it under Ctrl+Shift+L → " + kind + "s.",
      duration: 2400,
    }),
  focusStarted: (mins: number) =>
    toast(`Focus session started · ${mins} min`, {
      description: "Stay with it. Esc or Ctrl+Shift+F to end early.",
      duration: 2600,
      icon: "🎯",
    }),
  focusEnded: (completed: boolean, mins: number) =>
    completed
      ? toast.success("Focus session complete", {
          description: `${mins} min logged. Take a short break.`,
          duration: 3200,
        })
      : toast("Focus session ended early", {
          description: `${mins} min logged as partial.`,
          duration: 2400,
          icon: "⏹",
        }),
  navigated: (url: string) =>
    toast("Navigated", {
      description: url.length > 60 ? url.slice(0, 60) + "…" : url,
      duration: 1600,
    }),
  tabOpened: (title: string) =>
    toast("New tab", {
      description: title,
      duration: 1400,
    }),
  tabClosed: (title: string) =>
    toast("Tab closed", {
      description: title + " · Ctrl+Shift+T to reopen",
      duration: 2000,
    }),
  reloaded: () =>
    toast("Reloaded", { duration: 1200, icon: "↻" }),
  aiStarted: () =>
    toast("Thinking…", {
      description: "Lumen AI is processing your request.",
      duration: 4000,
      icon: "✨",
    }),
  aiDone: () =>
    toast.success("AI response ready", {
      description: "Saved option available.",
      duration: 2000,
    }),
  aiError: (msg: string) =>
    toast.error("AI request failed", {
      description: msg,
      duration: 4000,
    }),
  info: (msg: string, desc?: string) =>
    toast(msg, { description: desc, duration: 2200 }),
  error: (msg: string, desc?: string) =>
    toast.error(msg, { description: desc, duration: 4000 }),
};
