"use client";

import { RefObject } from "react";
import type { StudyPortal } from "@/lib/types";

interface Props {
  url: string;
  portal?: StudyPortal | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

/**
 * BlockedEmbedFallback — DEV/WEB-PREVIEW ONLY.
 *
 * Shown when a study site refuses iframe embedding (X-Frame-Options /
 * CSP frame-ancestors) in the browser preview. The packaged Electron app
 * NEVER renders this — it loads external sites in the native fullscreen
 * Chromium view.
 *
 * Deliberately NOT styled like product UI: no cards, no dashboard chrome,
 * no shortcut education. A full-window quiet notice + a single action.
 */
export function BlockedEmbedFallback({ url }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Preview cannot embed this site here.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg bg-[oklch(0.82_0.12_84)] px-5 py-2.5 text-sm font-medium text-[oklch(0.13_0.005_260)] transition hover:bg-[oklch(0.88_0.10_84)]"
      >
        Open Study Portal
      </a>
    </div>
  );
}
