"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { sbToast } from "@/lib/toast";

/**
 * TagManager — manage note tags in Settings → Library.
 *
 * Shows all tags used across notes with their note count. Allows:
 *  - Renaming a tag (updates all notes using it)
 *  - Deleting a tag (removes it from all notes)
 *  - Adding a new tag to a note (via the Quick Note flow)
 *
 * Tags are derived from notes — there's no separate tag entity. This
 * view aggregates them for management.
 */
export function TagManager() {
  const s = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  // Aggregate tags from notes
  const tags = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of s.notes) {
      for (const t of n.tags ?? []) {
        map.set(t, (map.get(t) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [s.notes]);

  function renameTag(oldName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditing(null);
      return;
    }
    if (tags.some(([t]) => t === trimmed)) {
      sbToast.error("Tag already exists", `A tag named "${trimmed}" already exists.`);
      return;
    }
    // Update all notes with this tag
    for (const n of s.notes) {
      if (n.tags?.includes(oldName)) {
        s.updateNoteTags(n.id, n.tags.map((t) => (t === oldName ? trimmed : t)));
      }
    }
    sbToast.info("Tag renamed", `"${oldName}" → "${trimmed}"`);
    setEditing(null);
    setNewName("");
  }

  function deleteTag(tag: string) {
    if (!confirm(`Delete tag "${tag}" from all notes?`)) return;
    for (const n of s.notes) {
      if (n.tags?.includes(tag)) {
        s.updateNoteTags(n.id, n.tags.filter((t) => t !== tag));
      }
    }
    sbToast.info("Tag deleted", `"${tag}" removed from all notes.`);
  }

  if (tags.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        No tags yet. Add tags when creating Quick Notes (Ctrl+Shift+N) — they&apos;ll appear here for management.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {tags.map(([tag, count], i) => (
        <motion.div
          key={tag}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="group flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2"
        >
          {editing === tag ? (
            // Edit mode
            <>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameTag(tag);
                  if (e.key === "Escape") { setEditing(null); setNewName(""); }
                }}
                className="flex-1 rounded border border-[oklch(0.82_0.12_84)] bg-background/50 px-2 py-0.5 text-xs text-foreground outline-none"
                placeholder={tag}
              />
              <button
                onClick={() => renameTag(tag)}
                className="rounded bg-[oklch(0.82_0.12_84)] px-2 py-0.5 text-[0.6rem] font-medium text-[oklch(0.13_0.004_260)]"
              >
                Save
              </button>
              <button
                onClick={() => { setEditing(null); setNewName(""); }}
                className="rounded px-2 py-0.5 text-[0.6rem] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </>
          ) : (
            // View mode
            <>
              <span className="rounded-full bg-[oklch(0.82_0.12_84)]/10 px-2 py-0.5 text-[0.65rem] font-medium sb-text-gold">
                #{tag}
              </span>
              <span className="text-[0.65rem] text-muted-foreground">
                {count} note{count !== 1 ? "s" : ""}
              </span>
              <div className="ml-auto flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => { setEditing(tag); setNewName(tag); }}
                  className="rounded px-2 py-0.5 text-[0.6rem] text-muted-foreground hover:text-foreground"
                >
                  Rename
                </button>
                <button
                  onClick={() => deleteTag(tag)}
                  className="rounded px-2 py-0.5 text-[0.6rem] text-muted-foreground hover:text-destructive"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}
