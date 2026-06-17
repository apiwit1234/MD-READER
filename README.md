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

1. Open the [latest release](https://github.com/apiwit1234/MD-READER/releases/latest).
2. Download **`PAXReader-win-Setup.exe`** and run it — no prerequisites, no
   admin rights. It installs to `%LOCALAPPDATA%\PAXReader` and creates a Start
   Menu entry. From then on it updates itself with small patches.

> Windows SmartScreen may warn on first install — builds are unsigned.
> Click **More info → Run anyway**. (This only appears on the first manual
> install; in-app updates afterward don't trigger it.)

### Which file do I download?

A release lists several files. Most people only need the first one:

| File | Download this if… |
|------|-------------------|
| **`PAXReader-win-Setup.exe`** | **You're a new user. This is the installer** — it sets up auto-updates. |
| `PAX-Reader-<ver>-x64-portable.exe` | You want a single-file copy that runs without installing (no auto-update). |
| `*-full.nupkg`, `releases.win.json`, `assets.win.json`, `RELEASES` | Never — these are update-feed files the app downloads automatically. |

### Updates

Updates are **small patches, not reinstalls**, and **nothing installs without
your say-so**. Shortly after launch the app checks for a new version and, if
one exists, shows a bottom-right card — **"Update vX available · Update now /
Close"**. "Update now" downloads the patch (usually a few MB) with a progress
bar, then restarts the app to apply it. You can also check manually any time in
**Settings → Updates**, and turn the startup check off there. Updating never
touches your settings (they live in `%APPDATA%`).

On a pre-1.1.x build? Those used a different installer and can't update across
automatically — download `PAXReader-win-Setup.exe` once and run it; your
settings carry over (they live in `%APPDATA%`).

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
npm run dist:dir        # unpacked dir (fast, for local checks)
npm run dist:portable   # single portable .exe
npm run dist            # portable .exe under release/
```

To cut a release, bump the version and run the publish script — it builds the
Velopack package and publishes one GitHub release (Setup.exe, portable, and the
update feed), verifying each asset. Full steps and the token setup are in
**[docs/RELEASING.md](docs/RELEASING.md)**:

```sh
npm version minor       # or patch — commits + tags
git push --follow-tags
npm run release:publish # scripts/release.ps1 — no token to type
```

> The NSIS / electron-updater migration channel was removed after v1.1.1; that
> release remains the bridge for any pre-1.1.0 install that still needs to cross
> over manually.

## Workflow & versioning

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the branch and version-bump process.
