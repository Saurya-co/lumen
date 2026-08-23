"use client";

import { RefObject, useEffect } from "react";

/**
 * FrameGuard — nothing to guard in web preview (we can't read cross-origin
 * iframe content). In the Electron build this corresponds to a preload
 * script that intercepts X-Frame-Options for the user's study site. Kept
 * here as a no-op placeholder so the surface composition is symmetric.
 */
export function FrameGuard({ iframeRef }: { iframeRef: RefObject<HTMLIFrameElement | null> }) {
  useEffect(() => {
    // no-op in web preview
    void iframeRef;
  }, [iframeRef]);
  return null;
}
