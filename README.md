# Lumen — Study Browser

A lightweight, power-efficient Chromium-based study browser. Your study website is the entire screen. Keyboard-first. No chrome.

## Features

- Frameless Chromium window (Electron) — the study site is the whole UI
- Keyboard-first navigation and quick portal switching
- Built-in study portals (LMS platforms)
- Session resume, toasts, and onboarding flow
- PDF viewer route

## Development

```bash
npm install
npm run dev            # Next.js dev server on http://127.0.0.1:3000
```

### Run the Electron shell in dev

```bash
npm run electron:compile
npx electron electron/dist/main.js
```

## Building the Windows app

Prerequisites: Node.js 18+, npm.

```bash
# 1. Regenerate the app icon from the master SVG (after changing public/logo.svg)
node scripts/make-icons.mjs

# 2. Full build: compile Electron TS, static-export the web app, package installers
npm run electron:build
```

Artifacts land in `dist/`:

- `Lumen-Setup-{version}-x64.exe` — NSIS installer
- `Lumen-{version}-portable-x64.exe` — portable single-file executable

## Distribution notes

- Binaries are unsigned. Windows SmartScreen may show "Unknown publisher" on
  first launch — recipients choose **More info → Run anyway**. To remove the
  warning, sign the executables with a code-signing certificate
  (`electron-builder.yml` → `win.certificateSubjectName`).

## Project structure

```
electron/          Electron main + preload (TypeScript), build resources
scripts/           Icon generation and web-export build helpers
src/app/           Next.js App Router pages
src/components/    UI components (study browser shell, shared UI)
public/            Static assets incl. master logo.svg
```

## Releasing

1. Bump `version` in `package.json`.
2. Run `npm run electron:build`.
