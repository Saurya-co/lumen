"use client";

import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { DEMO_STUDY_URL, PORTAL_MAP } from "@/lib/constants";
import { BlockedEmbedFallback } from "./blocked-embed-fallback";
import { FrameGuard } from "./frame-guard";
import { isNative } from "@/lib/native-bridge";

type LoadState = "idle" | "loading" | "loaded" | "blocked";

export function WebsiteView() {
  // PERF: subscribe to the active tab object only (stable reference until
  // the tab actually changes) + reload token — not the entire store.
  const activeTab = useStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const reloadToken = useStore((s) => s.reloadToken);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const url = activeTab?.url ?? "";
  const portal = activeTab?.portalId ? PORTAL_MAP[activeTab.portalId] : null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isInternal = url.startsWith("/") || (origin && url.startsWith(origin));
  const isBlob = url.startsWith("blob:");
  const embeddable = isInternal || isBlob || portal?.embeddable === true;

  // In the packaged Electron app, external websites render in the NATIVE
  // study WebContentsView (fullscreen Chromium surface owned by main
  // process). This renderer component must not paint anything behind it —
  // no cards, no fallbacks. Internal routes still render here as before.
  if (isNative() && url && !isInternal) {
    return null;
  }

  // Empty state — no URL yet. Deliberately NOT a landing page/dashboard:
  // just a quiet dark surface with a single pointer to Ctrl+L. After
  // onboarding, a portal is chosen immediately so this is rarely seen.
  if (!url) {
    return (
      <div className="sb-deepspace sb-stars absolute inset-0 flex items-center justify-center">
        <p className="text-xs text-muted-foreground/60">
          Press{" "}
          <span className="sb-kbd">Ctrl</span>{" "}
          <span className="sb-kbd">L</span>{" "}
          to open your study site.
        </p>
      </div>
    );
  }

  // Cross-origin blocked fallback (web preview only — Electron renders the
  // real site natively and never reaches this branch).
  if (!embeddable) {
    return <BlockedEmbedFallback url={url} portal={portal} iframeRef={iframeRef} />;
  }

  // Embeddable — render iframe with a key-based remount + onLoad tracking.
  // The `WebsiteFrame` child owns its own load state and is reset on URL
  // change via the `key` prop (the idiomatic React pattern for "reset
  // state when prop changes" instead of setState-in-effect).
  return (
    <WebsiteFrame
      key={`${url}-${reloadToken}`}
      url={url}
      title={activeTab?.title ?? "Study"}
      iframeRef={iframeRef}
    />
  );
}

function WebsiteFrame({
  url,
  title,
  iframeRef,
}: {
  url: string;
  title: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  // Resolve relative demo URL against the window origin at runtime
  const resolvedUrl = url.startsWith("/") && typeof window !== "undefined" ? window.location.origin + url : url;
  const displayUrl = resolvedUrl || DEMO_STUDY_URL;

  return (
    <div className="absolute inset-0">
      {loadState === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-[oklch(0.82_0.12_84)]" />
            <p className="text-xs text-muted-foreground">Loading study surface…</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={displayUrl}
        title={title}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
        allowFullScreen
        // SECURITY: The study website needs same-origin (for its own
        // cookies/auth), scripts (to function), forms (for logins),
        // popups (for OAuth), presentation (for fullscreen video), and
        // modals (for alerts). We omit allow-top-navigation to prevent
        // the framed site from navigating the parent window.
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-modals"
        referrerPolicy="no-referrer"
        onLoad={() => setLoadState("loaded")}
      />
      <FrameGuard iframeRef={iframeRef} />
    </div>
  );
}
