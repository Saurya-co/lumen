"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { PORTAL_MAP } from "@/lib/constants";
import { importPdf } from "@/lib/pdf-import";
import { sanitizeText, sanitizeTitle, sanitizeUrl } from "@/lib/sanitize";
import type { LibraryItem, QuickNote, Workspace } from "@/lib/types";
import { EmptyState } from "./empty-state";
import { StudyChart } from "./study-chart";
import { StudyDashboard } from "./study-dashboard";
import { SmartBookmarks } from "./smart-bookmarks";
import { SubjectsView } from "./subjects-view";
import { NotesSearch } from "./notes-search";
import { HighlightsView } from "./highlights-view";

type Tab = "dashboard" | "all" | "notes" | "bookmarks" | "lectures" | "pdfs" | "highlights" | "subjects" | "workspaces" | "sessions";

export function Library() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return s.library.filter((it) => {
      if (tab === "notes" && it.kind !== "note") return false;
      if (tab === "bookmarks" && it.kind !== "bookmark") return false;
      if (tab === "lectures" && it.kind !== "lecture") return false;
      if (tab === "pdfs" && it.kind !== "pdf") return false;
      if (ql) {
        const hay = [it.title, it.excerpt ?? "", ...(it.tags ?? [])].join(" ").toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [s.library, tab, q]);

  const notes = s.notes;
  const totalStudyMin = Math.floor(s.studySeconds / 60);
  const totalFocus = s.focusSessions.filter((f) => f.completed).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sb-deepspace sb-stars sb-anim-fade absolute inset-0 z-50 flex items-center justify-center p-6"
    >
      <div className="absolute inset-0" onClick={() => s.closeOverlay()} />
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden sb-glass sb-glass-gold rounded-2xl sb-anim-pop"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">📚</span>
            <div>
              <h2 className="text-base font-medium text-foreground">Study Library</h2>
              <p className="text-[0.65rem] text-muted-foreground">
                {s.library.length} items · {notes.length} notes · {totalFocus} focus sessions · {totalStudyMin} min studied
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-40 rounded-md border border-border bg-background/50 px-2.5 py-1 text-xs text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
            />
            <button
              onClick={() => void importPdf()}
              className="rounded-md border border-[oklch(0.82_0.12_84)]/40 px-3 py-1 text-xs font-medium sb-text-gold transition hover:bg-[oklch(0.82_0.12_84)]/10"
            >
              📄 PDF
            </button>
            <button
              onClick={() => s.setOverlay("quick-note")}
              className="rounded-md bg-[oklch(0.82_0.12_84)] px-3 py-1 text-xs font-medium text-[oklch(0.13_0.004_260)] transition hover:bg-[oklch(0.88_0.10_84)]"
            >
              + Note
            </button>
            <button onClick={() => s.closeOverlay()} className="sb-kbd">Esc</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto sb-no-scrollbar border-b border-border px-3 py-1.5">
          {([
            ["dashboard", "Dashboard"],
            ["all", "All"],
            ["notes", "Notes"],
            ["bookmarks", "Bookmarks"],
            ["lectures", "Lectures"],
            ["pdfs", "PDFs"],
            ["highlights", "Highlights"],
            ["subjects", "Subjects"],
            ["workspaces", "Workspaces"],
            ["sessions", "Focus sessions"],
          ] as [Tab, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition ${
                tab === k
                  ? "bg-[oklch(0.82_0.12_84)]/15 text-foreground ring-1 ring-[oklch(0.82_0.12_84)]/30"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto sb-scroll p-4">
          {tab === "dashboard" ? (
            <StudyDashboard />
          ) : tab === "workspaces" ? (
            <WorkspacesPane />
          ) : tab === "sessions" ? (
            <SessionsPane />
          ) : tab === "notes" ? (
            <NotesSearch notes={notes} />
          ) : tab === "bookmarks" ? (
            <SmartBookmarks q={q} />
          ) : tab === "highlights" ? (
            <HighlightsView />
          ) : tab === "subjects" ? (
            <SubjectsView />
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.length === 0 && (
                <EmptyState
                  icon={(tab as string) === "bookmarks" ? "★" : (tab as string) === "lectures" ? "🎬" : (tab as string) === "pdfs" ? "📄" : "📚"}
                  title={
                    (tab as string) === "bookmarks"
                      ? "No bookmarks yet"
                      : (tab as string) === "lectures"
                        ? "No lectures saved"
                        : (tab as string) === "pdfs"
                          ? "No PDFs in your library"
                          : "Nothing here yet"
                  }
                  description={
                    (tab as string) === "bookmarks"
                      ? "Mark important pages so you can return to them in one keystroke."
                      : (tab as string) === "lectures"
                        ? "Save your lecture position from Ctrl+K to resume where you left off."
                        : (tab as string) === "pdfs"
                          ? "Open a PDF and use Ctrl+K → 'Add PDF to Library' to keep it here."
                          : "Use Ctrl+K to save pages, lectures, or PDFs to your local library."
                  }
                  hint={
                    (tab as string) === "bookmarks"
                      ? "Ctrl+K → Smart bookmark this page"
                      : (tab as string) === "lectures"
                        ? "Ctrl+K → Save lecture position"
                        : (tab as string) === "pdfs"
                          ? "Ctrl+K → Add PDF to Library"
                          : "Ctrl+K opens the command center"
                  }
                  action={{
                    label: "Open Command Center",
                    onClick: () => s.setOverlay("command-center"),
                  }}
                />
              )}
              {filtered.map((it) => (
                <LibraryCard key={it.id} item={it} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[0.65rem] text-muted-foreground">
          <span>Local-first — all data stored in your browser</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="sb-kbd">Ctrl</span><span className="sb-kbd">Shift</span><span className="sb-kbd">L</span> library</span>
            <span className="flex items-center gap-1"><span className="sb-kbd">Esc</span> close</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LibraryCard({ item }: { item: LibraryItem }) {
  const s = useStore();
  const portal = item.portalId ? PORTAL_MAP[item.portalId] : null;
  const kindIcon: Record<LibraryItem["kind"], string> = {
    note: "📝", bookmark: "★", pdf: "📄", lecture: "🎬",
  };
  // SECURITY-UI: titles/URLs originate from webpages — sanitize for display.
  const title = sanitizeTitle(item.title);
  const url = sanitizeUrl(item.url);
  return (
    <div className="group rounded-xl border border-border bg-secondary/30 p-3 transition hover:bg-secondary/60">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm">{kindIcon[item.kind]}</span>
        {portal && (
          <div className="flex h-4 w-4 items-center justify-center rounded text-[0.5rem] font-bold text-white" style={{ background: portal.color }}>
            {portal.glyph}
          </div>
        )}
        <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">{item.kind}</span>
      </div>
      <p className="mb-1 line-clamp-2 text-sm font-medium text-foreground">{title}</p>
      {item.excerpt && <p className="line-clamp-2 text-xs text-muted-foreground">{sanitizeText(item.excerpt)}</p>}
      {url && (
        <p className="mt-1 truncate text-[0.6rem] text-muted-foreground/60">{url}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[0.6rem] text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          {item.url && (
            <button
              onClick={() => { s.newTab(item.url, item.title, item.portalId); s.closeOverlay(); }}
              className="rounded px-2 py-0.5 text-[0.65rem] text-[oklch(0.82_0.12_84)] hover:bg-[oklch(0.82_0.12_84)]/15"
            >
              Open
            </button>
          )}
          <button
            onClick={() => s.removeFromLibrary(item.id)}
            className="rounded px-2 py-0.5 text-[0.65rem] text-muted-foreground hover:bg-secondary"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function NotesPane({ notes, q }: { notes: QuickNote[]; q: string }) {
  const s = useStore();
  const filtered = q
    ? notes.filter((n) => n.text.toLowerCase().includes(q.toLowerCase()))
    : notes;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {filtered.length === 0 && (
        <EmptyState
          icon="📝"
          title={q ? "No notes match your search" : "No notes yet"}
          description={
            q
              ? `Nothing in your notes contains "${q}".`
              : "Capture a thought instantly with Quick Note — it links to the page you were on automatically."
          }
          hint={q ? undefined : "Ctrl+Shift+N"}
          action={
            q
              ? undefined
              : {
                  label: "Quick Note",
                  onClick: () => s.setOverlay("quick-note"),
                }
          }
        />
      )}
      {filtered.map((n) => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="group rounded-lg border border-border bg-secondary/30 p-3 transition hover:bg-secondary/60"
        >
          {n.tags?.includes("ai") && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-[oklch(0.82_0.12_84)]/15 px-2 py-0.5 text-[0.55rem] font-medium uppercase tracking-wide sb-text-gold">
              ✨ AI generated
            </div>
          )}
          <p className="text-sm text-foreground whitespace-pre-wrap">{n.text}</p>
          {n.tabTitle && (
            <p className="mt-2 truncate text-[0.6rem] text-muted-foreground">from: {n.tabTitle}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[0.6rem] text-muted-foreground">
              {new Date(n.createdAt).toLocaleString()}
            </span>
            <button
              onClick={() => s.deleteNote(n.id)}
              className="text-[0.65rem] text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground"
            >
              Delete
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function WorkspacesPane() {
  const s = useStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#a16207");

  return (
    <div className="space-y-4">
      <div className="sb-glass rounded-xl p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">New workspace</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name (e.g. JEE 2025)"
            className="flex-1 min-w-[200px] rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[oklch(0.82_0.12_84)]"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
          />
          <button
            onClick={() => { if (name.trim()) { s.addWorkspace(name.trim(), color); setName(""); } }}
            className="rounded-md bg-[oklch(0.82_0.12_84)] px-3 py-1.5 text-sm font-medium text-[oklch(0.13_0.004_260)] hover:bg-[oklch(0.88_0.10_84)]"
          >
            Create
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {s.workspaces.length === 0 && (
          <EmptyState
            icon="🗂"
            title="No workspaces yet"
            description="Create a workspace to group notes, lectures and tabs by subject — useful for juggling multiple exams."
            hint="Try: JEE 2025, GATE Prep, Semester 5"
          />
        )}
        {s.workspaces.map((w) => (
          <WorkspaceCard key={w.id} w={w} />
        ))}
      </div>
    </div>
  );
}

function WorkspaceCard({ w }: { w: Workspace }) {
  const s = useStore();
  const notesCount = s.notes.filter((n) => n.workspaceId === w.id).length;
  const libCount = s.library.filter((l) => l.workspaceId === w.id).length;
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ background: w.color }} />
        <h3 className="flex-1 text-sm font-medium text-foreground">{w.name}</h3>
        <button
          onClick={() => s.deleteWorkspace(w.id)}
          className="text-[0.65rem] text-muted-foreground hover:text-foreground"
        >
          Delete
        </button>
      </div>
      <p className="mt-2 text-[0.65rem] text-muted-foreground">
        {notesCount} notes · {libCount} library items
      </p>
    </div>
  );
}

function SessionsPane() {
  const s = useStore();
  if (s.focusSessions.length === 0) {
    return (
      <EmptyState
        icon="🎯"
        title="No focus sessions yet"
        description="Start a Pomodoro-style focus session to lock in deep work. Sessions are logged here with their duration and completion status."
        hint="Ctrl+Shift+F"
        action={{
          label: "Start focus session",
          onClick: () => s.startFocus(),
        }}
      />
    );
  }
  const totalMin = Math.floor(s.focusSessions.reduce((acc, f) => acc + f.durationSec, 0) / 60);
  const completedCount = s.focusSessions.filter((f) => f.completed).length;
  return (
    <div className="space-y-3">
      <StudyChart sessions={s.focusSessions} />
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Sessions</p>
          <p className="mt-1 text-lg font-light text-foreground">{s.focusSessions.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Completed</p>
          <p className="mt-1 text-lg font-light sb-text-gold">{completedCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Total time</p>
          <p className="mt-1 text-lg font-light text-foreground">{totalMin}m</p>
        </div>
      </div>
      <div className="space-y-1">
        {s.focusSessions.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${f.completed ? "bg-[oklch(0.82_0.12_84)]/15" : "bg-secondary"}`}>
              {f.completed ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="sb-text-gold">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">{f.tabTitle ?? "Focus session"}</p>
              <p className="text-[0.65rem] text-muted-foreground">
                {new Date(f.startedAt).toLocaleString()} · {Math.floor(f.durationSec / 60)} min
                {f.completed ? " · completed" : " · ended early"}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
