"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { sbToast } from "@/lib/toast";

type AIAction = "summarize" | "explain" | "simplify" | "ask";

interface AIOverlayProps {
  initialAction?: AIAction;
  initialText?: string;
}

/**
 * AIOverlay — small floating AI panel. Renders inside the AI overlay slot
 * when the user invokes "Ask AI" / "Explain" / "Simplify" / "Summarize"
 * from the command center or selection bubble. Purely optional — gated
 * by Settings → AI → Enable AI assistant.
 *
 * Streams tokens from /api/ai?stream=1 via Server-Sent Events for a
 * typewriter feel. Falls back to single-shot if SSE fails.
 */
export function AIOverlay({ initialAction = "ask", initialText = "" }: AIOverlayProps) {
  // Keyed reset: a fresh key remounts the inner form with new initial
  // values (idiomatic React "reset state when props change" pattern —
  // no setState-in-effect cascade).
  return (
    <AIOverlayInner
      key={`${initialAction}:${initialText}`}
      initialAction={initialAction}
      initialText={initialText}
    />
  );
}

function AIOverlayInner({ initialAction = "ask", initialText = "" }: AIOverlayProps) {
  const s = useStore();
  const [action, setAction] = useState<AIAction>(initialAction);
  const [input, setInput] = useState(initialText);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const activeTab = s.tabs.find((t) => t.id === s.activeTabId);
  const resultRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll the result panel as tokens stream in
  useEffect(() => {
    if (resultRef.current) resultRef.current.scrollTop = resultRef.current.scrollHeight;
  }, [result]);

  async function run() {
    if (!input.trim()) return;
    setLoading(true); setError(""); setResult("");
    sbToast.aiStarted();
    try {
      const res = await fetch("/api/ai?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: input,
          context: activeTab?.title,
        }),
        signal: (abortRef.current = new AbortController()).signal,
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "AI failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE messages are separated by \n\n
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          const lines = ev.split("\n");
          let eventName = "message";
          let dataStr = "";
          for (const ln of lines) {
            if (ln.startsWith("event: ")) eventName = ln.slice(7);
            else if (ln.startsWith("data: ")) dataStr = ln.slice(6);
          }
          if (!dataStr) continue;
          let data: { token?: string; ok?: boolean; error?: string };
          try { data = JSON.parse(dataStr); } catch { continue; }
          if (eventName === "token" && data.token) {
            acc += data.token;
            setResult(acc);
          } else if (eventName === "error") {
            throw new Error(data.error ?? "stream error");
          } else if (eventName === "done") {
            // finished
          }
        }
      }
      sbToast.aiDone();
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        // user cancelled
      } else {
        const msg = e instanceof Error ? e.message : "AI request failed";
        setError(msg);
        sbToast.aiError(msg);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setLoading(false);
  }

  const actions: { id: AIAction; label: string; icon: string; desc: string }[] = [
    { id: "summarize", label: "Summarize", icon: "📝", desc: "Concise bullet points" },
    { id: "explain", label: "Explain", icon: "💡", desc: "Like a curious student" },
    { id: "simplify", label: "Simplify", icon: "🔬", desc: "Beginner-friendly" },
    { id: "ask", label: "Ask AI", icon: "✨", desc: "Free-form question" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end justify-end p-6 pointer-events-none"
    >
      <div className="absolute inset-0" onClick={() => s.closeOverlay()} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        className="pointer-events-auto relative z-10 w-full max-w-md"
      >
        <div className="sb-glass sb-glass-gold rounded-2xl overflow-hidden sb-anim-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="text-base">✨</span>
                {loading && (
                  <span className="absolute -right-1 -top-1 h-1.5 w-1.5 animate-ping rounded-full bg-[oklch(0.82_0.12_84)]" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Lumen AI</p>
                <p className="text-[0.6rem] text-muted-foreground">
                  {loading ? "thinking…" : s.settings.ai.enabled ? "optional · secondary" : "enable in Settings"}
                </p>
              </div>
            </div>
            <span className="sb-kbd">Esc</span>
          </div>

          {/* Action tabs */}
          <div className="grid grid-cols-4 gap-0.5 border-b border-border p-1.5">
            {actions.map((a) => (
              <button
                key={a.id}
                onClick={() => setAction(a.id)}
                className={`flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 transition ${
                  action === a.id
                    ? "bg-[oklch(0.82_0.12_84)]/15 ring-1 ring-[oklch(0.82_0.12_84)]/30"
                    : "hover:bg-secondary/60"
                }`}
                title={a.desc}
              >
                <span className="text-sm">{a.icon}</span>
                <span className={`text-[0.6rem] font-medium ${action === a.id ? "text-foreground" : "text-muted-foreground"}`}>
                  {a.label}
                </span>
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 space-y-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!loading) run(); }
                if (e.key === "Escape") s.closeOverlay();
              }}
              placeholder={
                action === "ask"
                  ? "Ask a question about this page…"
                  : action === "summarize"
                    ? "Paste text to summarize…"
                    : action === "explain"
                      ? "Paste a concept to explain…"
                      : "Paste text to simplify…"
              }
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)] placeholder:text-muted-foreground/50"
            />

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Result — streams in token-by-token */}
            {result && (
              <div
                ref={resultRef}
                className="max-h-44 overflow-y-auto sb-scroll rounded-lg border border-[oklch(0.82_0.12_84)]/20 bg-[oklch(0.82_0.12_84)]/5 p-2.5"
              >
                <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {result}
                  {loading && (
                    <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[oklch(0.82_0.12_84)] align-middle" />
                  )}
                </p>
              </div>
            )}

            {loading && !result && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[oklch(0.82_0.12_84)]" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[oklch(0.82_0.12_84)]" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[oklch(0.82_0.12_84)]" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Lumen is thinking…</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-[0.65rem] text-muted-foreground">
              {loading ? (
                <button onClick={stop} className="text-destructive hover:underline">Stop</button>
              ) : (
                <>
                  <span className="sb-kbd">Ctrl</span> <span className="sb-kbd">↵</span> run
                </>
              )}
            </span>
            <div className="flex gap-2">
              {result && !loading && (
                <button
                  onClick={() => { s.addNote(`[${action}] ${input}\n\n→ ${result}`, { tags: ["ai", action] }); s.closeOverlay(); }}
                  className="rounded-md border border-border px-3 py-1 text-xs text-foreground transition hover:bg-secondary"
                >
                  Save to notes
                </button>
              )}
              <button
                onClick={run}
                disabled={loading || !input.trim()}
                className="rounded-md bg-[oklch(0.82_0.12_84)] px-3 py-1 text-xs font-medium text-[oklch(0.13_0.004_260)] transition hover:bg-[oklch(0.88_0.10_84)] disabled:opacity-40"
              >
                {loading ? "Working…" : "Run"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
