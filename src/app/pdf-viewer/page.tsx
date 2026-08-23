"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Lumen internal PDF / document viewer.
 *
 * Renders as a fullscreen study surface (like the demo study surface) but
 * tailored for PDFs and long-form documents:
 *  - For real PDF URLs (ends with .pdf or content-type application/pdf),
 *    uses the browser's native PDF viewer inside an iframe — Chromium
 *    renders PDFs natively with built-in search, zoom, page nav.
 *  - For non-PDF URLs, shows a structured "document preview" with a
 *    sidebar (chapters / key concepts) + main reading pane + selection
 *    actions. This is the embeddable demo surface for the Lumen preview
 *    when the user opens a PDF that the cross-origin sandbox can't fetch.
 *
 * Query params:
 *  - url: the document URL to render
 *  - title: display title
 *  - kind: "pdf" | "doc" (default pdf)
 */

function PdfViewerContent() {
  const sp = useSearchParams();
  const url = sp.get("url") ?? "";
  const title = sp.get("title") ?? "Document";
  const kind = (sp.get("kind") as "pdf" | "doc") ?? "pdf";
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onSel() {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 3) { setSelection(null); return; }
      const range = sel?.getRangeAt(0);
      if (!range) return;
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      setSelection({ text, x: rect.left + rect.width / 2, y: rect.top });
    }
    document.addEventListener("selectionchange", onSel);
    document.addEventListener("mouseup", onSel);
    return () => {
      document.removeEventListener("selectionchange", onSel);
      document.removeEventListener("mouseup", onSel);
    };
  }, []);

  function sendToParent(action: string, text: string) {
    try {
      window.parent?.postMessage(
        { source: "lumen-pdf-viewer", action, text, title },
        "*"
      );
    } catch { /* noop */ }
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }

  // Real PDF: render via native browser PDF viewer
  const isRealPdf = kind === "pdf" && (url.endsWith(".pdf") || url.includes(".pdf?"));

  if (isRealPdf && url) {
    return (
      <div className="h-screen w-screen bg-[oklch(0.10_0.005_260)] text-[oklch(0.96_0.004_260)]">
        {/* Top toolbar */}
        <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              className="flex h-7 w-7 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white"
              title="Toggle sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M9 4v16" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <span className="text-sm">📄</span>
            <div>
              <p className="text-xs font-medium text-white/90 truncate max-w-[300px]">{title}</p>
              <p className="text-[0.6rem] text-white/40">PDF · Internal viewer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="flex h-6 w-6 items-center justify-center rounded text-white/60 hover:bg-white/10"
            >−</button>
            <span className="text-xs tabular-nums text-white/70 w-12 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="flex h-6 w-6 items-center justify-center rounded text-white/60 hover:bg-white/10"
            >+</button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 flex h-6 items-center gap-1 rounded bg-white/10 px-2 text-[0.65rem] text-white/70 hover:bg-white/20"
            >
              Open ↗
            </a>
          </div>
        </div>

        <div className="flex h-[calc(100vh-2.5rem)]">
          {sidebarOpen && (
            <aside className="w-56 shrink-0 border-r border-white/5 bg-black/30 p-3">
              <p className="mb-2 text-[0.6rem] font-medium uppercase tracking-wider text-white/40">Outline</p>
              <ul className="space-y-1 text-xs">
                {["Cover", "1. Introduction", "2. Foundations", "3. Core concepts", "4. Examples", "5. Summary", "References"].map((c, i) => (
                  <li key={i}>
                    <button
                      onClick={() => setCurrentPage(i + 1)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left transition ${
                        currentPage === i + 1 ? "bg-[oklch(0.82_0.12_84)]/15 text-white" : "text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-[0.55rem] tabular-nums text-white/30">{i + 1}</span>
                      <span className="truncate">{c}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-white/5 pt-3">
                <p className="mb-1 text-[0.6rem] font-medium uppercase tracking-wider text-white/40">Tools</p>
                <button
                  onClick={() => {
                    const sel = window.getSelection()?.toString().trim();
                    sendToParent("highlight", sel || "Highlight this section");
                  }}
                  className="mb-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[0.7rem] text-white/60 hover:bg-white/5"
                >🖍 Highlight selection</button>
                <button
                  onClick={() => sendToParent("annotate", "Add annotation")}
                  className="mb-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[0.7rem] text-white/60 hover:bg-white/5"
                >✎ Annotate</button>
                <button
                  onClick={() => sendToParent("ai", "Explain this PDF")}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[0.7rem] sb-text-gold hover:bg-[oklch(0.82_0.12_84)]/10"
                >✨ Ask AI</button>
              </div>
            </aside>
          )}

          {/* PDF render via native iframe */}
          <main className="flex-1 overflow-auto bg-[oklch(0.13_0.005_260)]">
            <iframe
              src={url}
              title={title}
              className="h-full w-full border-0"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
              // SECURITY: sandbox the PDF iframe. allow-scripts is needed
              // for the native PDF viewer's JS. allow-same-origin is NOT
              // included — the PDF viewer doesn't need to access the
              // parent's origin, and omitting it prevents the framed
              // content from escaping if a malicious PDF exploit fires.
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
            />
          </main>
        </div>

        <SelectionBubble selection={selection} onAction={sendToParent} />
      </div>
    );
  }

  // Document preview (non-PDF or sandboxed PDF): structured reading view
  return (
    <div className="h-screen w-screen bg-[oklch(0.10_0.005_260)] text-[oklch(0.96_0.004_260)]">
      <div className="flex h-full">
        {/* Sidebar — chapters / key concepts */}
        <aside className="hidden w-64 flex-col border-r border-white/5 bg-black/30 md:flex">
          <div className="border-b border-white/5 p-4">
            <p className="text-[0.6rem] font-medium uppercase tracking-wider text-white/40">Document</p>
            <h2 className="mt-1 text-sm font-medium text-white truncate">{title}</h2>
            <p className="mt-1 text-[0.65rem] text-white/40">12 pages · 4.2 MB</p>
          </div>
          <div className="flex-1 overflow-y-auto sb-no-scrollbar">
            <div className="p-3">
              <p className="mb-2 text-[0.6rem] font-medium uppercase tracking-wider sb-text-gold">Chapters</p>
              {[
                { title: "Abstract", page: 1 },
                { title: "1. Introduction", page: 2 },
                { title: "2. Background", page: 4 },
                { title: "3. Methodology", page: 6 },
                { title: "4. Results", page: 8 },
                { title: "5. Discussion", page: 10 },
                { title: "6. Conclusion", page: 11 },
                { title: "References", page: 12 },
              ].map((c, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(c.page)}
                  className={`flex w-full items-center gap-3 rounded px-2.5 py-1.5 text-left text-xs transition ${
                    currentPage === c.page ? "bg-[oklch(0.82_0.12_84)]/15 text-white" : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded text-[0.55rem] tabular-nums"
                    style={{ background: currentPage === c.page ? "oklch(0.82 0.12 84)" : "rgba(255,255,255,0.06)", color: currentPage === c.page ? "#0a0a0f" : "rgba(255,255,255,0.5)" }}
                  >{c.page}</span>
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-white/5 p-3">
              <p className="mb-2 text-[0.6rem] font-medium uppercase tracking-wider sb-text-gold">Key concepts</p>
              <div className="flex flex-wrap gap-1.5">
                {["entropy", "microstates", "Boltzmann", "irreversibility", "heat engine", "Carnot cycle"].map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] text-white/60">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 p-3">
            <button
              onClick={() => sendToParent("ai", "Summarize this document")}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[oklch(0.82_0.12_84)] px-3 py-1.5 text-xs font-medium text-[oklch(0.13_0.004_260)] transition hover:bg-[oklch(0.88_0.10_84)]"
            >
              ✨ Summarize document
            </button>
          </div>
        </aside>

        {/* Main — page */}
        <main className="flex flex-1 flex-col" ref={containerRef}>
          <div className="flex items-center justify-between border-b border-white/5 bg-black/30 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/10">←</button>
              <span className="tabular-nums">Page {currentPage} of 12</span>
              <button onClick={() => setCurrentPage((p) => Math.min(12, p + 1))} className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/10">→</button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => sendToParent("note", "Document note")}
                className="flex h-6 items-center gap-1 rounded bg-white/10 px-2 text-[0.65rem] text-white/70 hover:bg-white/20"
              >📝 Note</button>
              <button
                onClick={() => sendToParent("ai", "Explain this page")}
                className="flex h-6 items-center gap-1 rounded bg-[oklch(0.82_0.12_84)]/20 px-2 text-[0.65rem] sb-text-gold hover:bg-[oklch(0.82_0.12_84)]/30"
              >✨ Ask AI</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto sb-no-scrollbar bg-[oklch(0.13_0.005_260)] p-8">
            <div className="mx-auto max-w-2xl">
              <article className="prose prose-invert max-w-none">
                <h1 className="text-2xl font-light text-white mb-1">{title}</h1>
                <p className="text-[0.65rem] text-white/40 mb-6">Page {currentPage} · Internal Lumen PDF viewer</p>

                <h2 className="text-lg font-medium text-white/90 mb-3">
                  {["Abstract", "Introduction", "Background", "Methodology", "Results", "Discussion", "Conclusion", "References"][Math.min(currentPage - 1, 7)]}
                </h2>
                <p className="text-sm leading-relaxed text-white/70 mb-4">
                  This section presents the conceptual framework underlying the second law of thermodynamics. We begin by revisiting the historical development from Clausius and Boltzmann, then formalize the modern statistical interpretation in terms of microstate counting.
                </p>
                <p className="text-sm leading-relaxed text-white/60 mb-4">
                  The entropy <em className="text-white/80 not-italic font-medium">S</em> of an isolated system is defined up to an additive constant by the relation <code className="rounded bg-white/10 px-1 py-0.5 text-[0.75em]">S = k<sub>B</sub> ln Ω</code>, where Ω denotes the number of accessible microstates consistent with the macroscopic constraints. This relation, due to Boltzmann, provides the bridge between microscopic mechanics and macroscopic thermodynamics.
                </p>
                <p className="text-sm leading-relaxed text-white/60 mb-4">
                  Consider a gas of N molecules in a container of volume V. The number of microstates scales as V<sup>N</sup>, giving an entropy contribution N k<sub>B</sub> ln V. An isothermal expansion from V<sub>1</sub> to V<sub>2</sub> therefore produces an entropy change ΔS = N k<sub>B</sub> ln(V<sub>2</sub>/V<sub>1</sub>) — the canonical result.
                </p>
                <blockquote className="border-l-2 border-[oklch(0.82_0.12_84)] pl-4 my-4 text-sm text-white/70 italic">
                  &ldquo;The increase of entropy is what gives time its arrow. It is the only physical law that is asymmetric in time.&rdquo;
                </blockquote>
                <p className="text-sm leading-relaxed text-white/60">
                  Select any text in this pane to invoke the Explain / Simplify / Note / AI actions. The internal viewer is used because the original PDF could not be embedded directly in the web preview.
                </p>
              </article>
            </div>
          </div>
        </main>
      </div>

      <SelectionBubble selection={selection} onAction={sendToParent} />
    </div>
  );
}

function SelectionBubble({
  selection,
  onAction,
}: {
  selection: { text: string; x: number; y: number } | null;
  onAction: (action: string, text: string) => void;
}) {
  if (!selection) return null;
  return (
    <div
      className="fixed z-50 -translate-x-1/2 -translate-y-full"
      style={{ left: selection.x, top: selection.y - 8 }}
    >
      <div className="sb-glass sb-glass-gold rounded-full p-1 flex items-center gap-0.5 shadow-xl">
        <button
          onClick={() => onAction("explain", selection.text)}
          className="rounded-full px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/70"
        >Explain</button>
        <button
          onClick={() => onAction("simplify", selection.text)}
          className="rounded-full px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/70"
        >Simplify</button>
        <button
          onClick={() => onAction("note", selection.text)}
          className="rounded-full px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/70"
        >Note</button>
        <button
          onClick={() => onAction("ai", selection.text)}
          className="rounded-full px-3 py-1 text-xs font-medium bg-[oklch(0.82_0.12_84)] text-[oklch(0.13_0.004_260)] hover:bg-[oklch(0.88_0.10_84)]"
        >✨ AI</button>
      </div>
    </div>
  );
}

export default function PdfViewerPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[oklch(0.10_0.005_260)]" />}>
      <PdfViewerContent />
    </Suspense>
  );
}
