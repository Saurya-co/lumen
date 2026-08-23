"use client";

import { useStore } from "@/lib/store";
import { sbToast } from "@/lib/toast";
import { isNative } from "@/lib/native-bridge";

/**
 * importPdf — the ONE entry point for importing a local PDF.
 *
 * Electron: opens the native OS file dialog filtered to .pdf only. The
 * main process returns a validated path + file:// URL, which is loaded
 * into the fullscreen Chromium study view (native PDF viewer) and saved
 * to the Library for one-click reopen.
 *
 * Web preview: hidden <input type="file"> restricted to application/pdf,
 * rendered via a blob: URL in the preview iframe.
 */

export interface PickedPdf {
  fileUrl: string;
  name: string;
}

function openPdfTarget(fileUrl: string, name: string) {
  const st = useStore.getState();

  // Already in Library? Just open it and bump visit stats.
  const existing = st.library.find((l) => l.kind === "pdf" && l.url === fileUrl);
  st.newTab(fileUrl, name);
  if (existing) {
    st.visitLibraryItem(existing.id);
  } else {
    st.addToLibrary({ kind: "pdf", title: name, url: fileUrl, tags: ["pdf"] });
  }
}

export async function importPdf(): Promise<void> {
  // ---- Electron: native dialog, .pdf filter enforced by main process ----
  if (isNative() && typeof window !== "undefined" && window.lumen?.pdfPick) {
    try {
      const picked = (await window.lumen.pdfPick()) as PickedPdf | null;
      if (!picked) return; // user cancelled
      openPdfTarget(picked.fileUrl, picked.name);
    } catch (err) {
      console.error("[Lumen] PDF import failed:", err);
      sbToast.info("Import failed", "Could not import that PDF.");
    }
    return;
  }

  // ---- Web preview fallback: hidden input locked to PDFs ----
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/pdf,.pdf";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
    if (!isPdf) {
      sbToast.info("PDF only", "Please choose a .pdf file.");
      return;
    }
    openPdfTarget(URL.createObjectURL(file), file.name);
  };
  input.click();
}
