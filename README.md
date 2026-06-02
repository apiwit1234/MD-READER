# MD Reader

Personal markdown reader desktop app (Electron + Next.js) with multi-folder
navigation, interactive Mermaid diagrams, an embedded terminal, a Git panel,
resizable panels, and light/dark theme.

## Requirements

- Node 20+ (Node 18 minimum)
- Windows (the app ships as a Windows desktop build; native `node-pty` powers the terminal)

## Install

```sh
npm install
```

If the embedded terminal fails to start after install or an Electron upgrade,
rebuild the native module against Electron:

```sh
npx electron-rebuild
```

## Develop

Runs the Next.js dev server and Electron together (hot reload):

```sh
npm run dev
```

This starts Next on http://localhost:3000 and launches the Electron window
pointed at it. Close the window to stop.

## Test

```sh
npm test          # run the Vitest suite once
npm run test:watch
```

## Build a release version

Produces a distributable Windows app under `release/` via electron-builder:

```sh
npm run dist            # installer
npm run dist:portable   # single portable .exe
npm run dist:dir        # unpacked dir (fast, for local checks)
```

`build:next` runs automatically before packaging. Builds are unsigned
(code-signing discovery is disabled for internal use).

## Workflow & versioning

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the branch and version-bump process.
