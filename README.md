# MD Reader

Personal markdown reader desktop app (Electron + Next.js) with multi-folder
navigation, interactive Mermaid diagrams, an embedded terminal, a Git panel,
resizable panels, and six themes: Light, Dark, Aurora, Nord, Sepia Paper and
Dracula — every surface (diagrams, code editor, terminal, title bar) follows
the active theme.

Mermaid support includes standalone `.mmd` / `.mermaid` files (opened as
full-pane diagram tabs with a Source toggle) and instant re-render: saving an
open file from any editor refreshes its tab in well under a second. When a
diagram's source has a syntax error, the last good render stays visible with
a "stale" badge and a collapsible error panel.

## Install (users)

1. Download the latest `MD-Reader-X.Y.Z-x64.exe` from
   [GitHub Releases](https://github.com/apiwit1234/MD-READER/releases).
2. Run it. The installer lets you:
   - choose the install folder (default: `%LOCALAPPDATA%\Programs\MD Reader`)
   - tick/untick **Create a desktop shortcut**
3. Done. A Start Menu entry is always created.

**Updates are automatic**: the app checks GitHub Releases shortly after
launch, downloads new versions in the background, and installs them when you
close the app. Disable or trigger manually in **Settings → Updates**.
Reinstalling or updating never touches your settings (they live in
`%APPDATA%`).

> Windows SmartScreen may warn on first install — builds are unsigned.
> Click "More info" → "Run anyway".

## Develop

Requirements: Node 20+, Windows (native `node-pty` powers the terminal).

```sh
npm install
npm run dev        # Next.js dev server + Electron with hot reload
```

If the embedded terminal fails to start after install or an Electron upgrade:

```sh
npx electron-rebuild
```

## Test

```sh
npm test           # run the Vitest suite once
npm run test:watch
```

## Build & release

```sh
npm run dist            # NSIS installer (+ zip) under release/
npm run dist:portable   # single portable .exe
npm run dist:dir        # unpacked dir (fast, for local checks)
```

Publishing a release that installed apps auto-update to:
see **[docs/RELEASING.md](docs/RELEASING.md)**.

## Workflow & versioning

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the branch and version-bump process.
