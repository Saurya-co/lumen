# Lumen — Study Browser (Electron Desktop Shell)

This folder contains the **Chromium-based desktop shell** for Lumen, the
lightweight, power-efficient Study Browser. It wraps the Next.js UI (which
you see in the live preview) into a real Windows application that can be
packaged as an `.exe`.

## What it does

- Opens a frameless, chromeless BrowserWindow — your study website fills
  the entire window, exactly like the web preview.
- Hosts the study website inside a child **WebContentsView** (the Electron
  equivalent of a fullscreen iframe, but without X-Frame-Options limits).
- Strips `X-Frame-Options` and `Content-Security-Policy` headers so real
  study sites (PW, Unacademy, YouTube, NPTEL, your college LMS) render
  fullscreen — the same fallback you see in the web preview is **not**
  shown here because there are no embedding restrictions.
- Registers **native accelerator shortcuts** (Ctrl+K, Ctrl+L, Ctrl+Tab,
  Ctrl+T/W/Shift+T, Alt+←/→, Ctrl+R, Ctrl+F, Ctrl+Shift+N/F/L, Ctrl+,)
  via `globalShortcut` so they work even when keyboard focus is inside the
  study website (the web preview can't do this for cross-origin iframes —
  that's why the small floating "Lumen" chip is clickable there).
- Forwards URL/tab changes from the React UI to the native study view via
  type-safe IPC.
- Single-instance lock: a second launch just focuses the first window.

## Files

| File             | Purpose                                                       |
| ---------------- | ------------------------------------------------------------ |
| `main.ts`        | Main process — window, study view, header stripping, IPC, accelerators |
| `preload.ts`     | Preload — exposes `window.lumen.*` API to the renderer       |

## How to build the Windows `.exe`

The Next.js project and the Electron shell are kept separate so the live
preview never depends on Electron. The desktop build needs Electron
installed once locally — these steps are run on a Windows machine (or in
any CI runner that supports Electron).

### 1. Install Electron tooling

```bash
# in the project root
bun add -d electron electron-builder typescript
```

### 2. Add these scripts to `package.json`

```jsonc
{
  "scripts": {
    "electron:dev": "LUMEN_DEV=1 concurrently \"bun run dev\" \"wait-on http://localhost:3000 && electron electron/main.ts",
    "electron:build:web": "next build && next export -o out",
    "electron:build": "bun run electron:build:web && electron-builder",
    "electron:dist": "bun run electron:build"
  },
  "build": {
    "appId": "com.lumen.studybrowser",
    "productName": "Lumen",
    "directories": { "output": "dist" },
    "files": [
      "out/**/*",
      "electron/dist/**/*"
    ],
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64"] },
        { "target": "portable", "arch": ["x64"] }
      ],
      "artifactName": "Lumen-${version}-${arch}.${ext}"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "shortcutName": "Lumen Study Browser"
    }
  }
}
```

### 3. Compile the Electron TypeScript

```bash
bunx tsc electron/main.ts electron/preload.ts \
  --outDir electron/dist \
  --module commonjs --target es2020 --esModuleInterop \
  --skipLibCheck --resolveJsonModule
```

### 4. Produce the installer + portable exe

```bash
bun run electron:build
```

Output lands in `dist/`:

- `Lumen-Setup-x64.exe` — NSIS installer (recommended)
- `Lumen-1.0.0-x64.exe` — portable single-file executable

## Performance notes

- **Low RAM/CPU**: `studyView` is the only heavy WebContents. The renderer
  (Next.js UI) is light — overlays only mount when active. Background tabs
  can be paused via `webContents.stop()` in a future iteration.
- **Fast startup**: `app.whenReady()` → single BrowserWindow → load. No
  splash screen needed; the window shows on `ready-to-show`.
- **Minimal background processes**: single-instance lock prevents duplicate
  Electron processes. No auto-update polling by default.
- **Local-first storage**: persists to `app.getPath("userData")/Local State`
  via the Next.js `localStorage` polyfill — survives reinstalls.

## Why two builds?

This repository is set up for a **cloud preview** (Next.js dev server on
port 3000). The preview cannot ship a real `.exe` from a Linux sandbox, so:

- The **live preview** at `/` runs the full UI with an iframe-based study
  view. Sites that refuse embedding show a graceful fallback with a "Open
  in new tab" option, plus a one-click switch to the embeddable demo study
  surface.
- The **packaged desktop app** renders the same UI but with native study
  views (no embedding restrictions) and native accelerators.

Both share the same React components, the same Zustand store, the same
local-first persistence layer — so the preview is a faithful, interactive
demonstration of the final product.

## Dev: running Electron locally against the live Next.js server

```bash
LUMEN_DEV=1 electron electron/main.ts
```

Make sure `bun run dev` is already running on port 3000 first.
