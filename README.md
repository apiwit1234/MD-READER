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
| `PAX-Reader-<ver>-x64.exe` | **Don't** — this is the legacy installer kept only so people on the old v1.0.x can migrate. New users should ignore it. |
| `latest.yml`, `*.blockmap`, `*.zip`, `*-full.nupkg`, `releases.win.json`, `assets.win.json`, `RELEASES` | Never — these are update-feed files the app downloads automatically. |

### Updates

Updates are **small patches, not reinstalls**, and **nothing installs without
your say-so**. Shortly after launch the app checks for a new version and, if
one exists, shows a bottom-right card — **"Update vX available · Update now /
Close"**. "Update now" downloads the patch (usually a few MB) with a progress
bar, then restarts the app to apply it. You can also check manually any time in
**Settings → Updates**, and turn the startup check off there. Updating never
touches your settings (they live in `%APPDATA%`).

Upgrading from an old NSIS install (≤ v1.0.x)? It auto-updates once via the old
mechanism, then shows a one-click **"Upgrade now"** banner that switches you to
the new patch-based updater.

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
npm run dist            # NSIS installer (+ portable + zip) under release/
```

To cut a release, bump the version and run the publish script — it builds both
update channels and publishes one GitHub release with all assets, verifying
each. Full steps and the token setup are in **[docs/RELEASING.md](docs/RELEASING.md)**:

```sh
npm version minor       # or patch — commits + tags
git push --follow-tags
npm run release:publish # scripts/release.ps1 — no token to type
```

### Maintainer cleanup — drop the legacy NSIS channel (planned for a future release)

`PAX-Reader-<ver>-x64.exe`, its `.blockmap`, the `.zip`, and `latest.yml` exist
only to let pre-v1.1.0 (NSIS / electron-updater) installs migrate to Velopack.
Once you're confident no v1.0.x installs remain in the wild, do this in one
release to slim every release to just the Velopack + portable assets:

- [ ] remove the `nsis` and `zip` targets and the `publish` block from
      `package.json` → `build.win`
- [ ] drop the NSIS assets (`latest.yml`, `PAX-Reader-*-x64.exe`, `*.blockmap`,
      `*.zip`) from the `$assets` list **and** the `latest.yml` check in
      `scripts/release.ps1`
- [ ] delete the NSIS→Velopack migration code: `electron/migrate-nsis.cjs`,
      the `migrate:detect`/`migrate:run` IPC in `electron/main.cjs`, the
      `migrate` bridge in `electron/preload.cjs`/`src/lib/electron-api.ts`, and
      the "Upgrade now" banner in `src/app/page.tsx`
- [ ] remove `electron/installer.nsh`

## Workflow & versioning

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the branch and version-bump process.
