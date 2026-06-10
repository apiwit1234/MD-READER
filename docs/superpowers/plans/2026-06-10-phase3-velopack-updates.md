# Phase 3: Velopack Delta Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace electron-updater/NSIS full-reinstall updates with Velopack delta updates: users install via a self-contained Setup.exe and update entirely from the in-app UI (check → progress bar → Restart & Update), downloading only small patches. Existing NSIS installs migrate with one click.

**Architecture:** `vpk pack` wraps the electron-builder `--dir` output into Velopack packages published to the existing GitHub Releases repo. A new `electron/updater.cjs` wraps Velopack's `UpdateManager` behind the existing IPC surface (plus download/progress channels). A migration module detects NSIS installs and swaps them for the Velopack install with user consent.

**Tech Stack:** velopack (npm, main-process dep), vpk CLI (dotnet tool, developer machine only), electron-builder (`--dir` + portable only), GitHub Releases.

**Conventions:** Spec at `docs/superpowers/specs/2026-06-10-pax-reader-2.0-revamp-design.md`. Repo: `apiwit1234/MD-READER`. Product: `PAX Reader`, appId `io.local.mdreader`.

**API-verification note (do this in Task 1 Step 1, not later):** The `velopack` JS binding API below matches the documented surface as of early 2026 (`VelopackApp.build().run()`, `new UpdateManager(urlOrPath, options)`, `getUpdateManager`-style async methods). Before writing code, pull the current docs (Context7: `/velopack/velopack` or https://docs.velopack.io/integrations/javascript) and adjust names if the binding has drifted. Everything else in this plan is independent of those exact names.

---

### Task 1: Add velopack + updater module

**Files:**
- Modify: `package.json` (`dependencies`: add `velopack`)
- Create: `electron/updater.cjs`
- Test: `src/lib/__main__/updater.test.ts`

- [ ] **Step 1: Verify current velopack JS API** (see note above), then install:

Run: `npm install velopack`
(`dependencies`, not dev — it must ship in the asar like node-pty. Check whether velopack ships native binaries needing `asarUnpack`; if `require('velopack')` fails from inside an asar in the packaged smoke test (Task 5), add `"node_modules/velopack/**/*"` to `build.asarUnpack`.)

- [ ] **Step 2: Write the failing tests** (logic only — Velopack itself is mocked)

```ts
// src/lib/__main__/updater.test.ts
import { describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createUpdater } = require('../../../electron/updater.cjs');

function fakeVelopack(overrides: Record<string, unknown> = {}) {
  return {
    isInstalled: () => true,
    checkForUpdatesAsync: vi.fn().mockResolvedValue({ targetFullRelease: { version: '2.0.1' } }),
    downloadUpdateAsync: vi.fn().mockResolvedValue(undefined),
    waitExitThenApplyUpdates: vi.fn(),
    applyUpdatesAndRestart: vi.fn(),
    ...overrides,
  };
}

describe('createUpdater', () => {
  it('is a no-op when not packaged', async () => {
    const u = createUpdater({ isPackaged: false, makeManager: () => fakeVelopack() });
    expect(await u.check()).toEqual({ ok: false, error: 'dev build — updates only work in the installed app' });
  });

  it('is a no-op when velopack reports not installed (portable build)', async () => {
    const u = createUpdater({
      isPackaged: true,
      makeManager: () => fakeVelopack({ isInstalled: () => false }),
    });
    expect(await u.check()).toEqual({ ok: false, error: 'portable build — download new versions manually' });
  });

  it('reports an available version', async () => {
    const u = createUpdater({ isPackaged: true, makeManager: () => fakeVelopack() });
    expect(await u.check()).toEqual({ ok: true, version: '2.0.1' });
  });

  it('reports up to date when check returns null', async () => {
    const u = createUpdater({
      isPackaged: true,
      makeManager: () => fakeVelopack({ checkForUpdatesAsync: vi.fn().mockResolvedValue(null) }),
    });
    expect(await u.check()).toEqual({ ok: true, version: null });
  });

  it('downloads with progress and remembers the pending update', async () => {
    const mgr = fakeVelopack();
    const onProgress = vi.fn();
    const u = createUpdater({ isPackaged: true, makeManager: () => mgr, onProgress });
    await u.check();
    const r = await u.download();
    expect(r.ok).toBe(true);
    expect(mgr.downloadUpdateAsync).toHaveBeenCalled();
    expect(u.installAndRestart()).toBe(true);
    expect(mgr.applyUpdatesAndRestart).toHaveBeenCalled();
  });

  it('install is refused before a download completes', () => {
    const u = createUpdater({ isPackaged: true, makeManager: () => fakeVelopack() });
    expect(u.installAndRestart()).toBe(false);
  });

  it('check failures return the error message', async () => {
    const u = createUpdater({
      isPackaged: true,
      makeManager: () => fakeVelopack({ checkForUpdatesAsync: vi.fn().mockRejectedValue(new Error('offline')) }),
    });
    expect(await u.check()).toEqual({ ok: false, error: 'offline' });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/__main__/updater.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `electron/updater.cjs`**

```js
// electron/updater.cjs
'use strict';

const UPDATE_URL = 'https://github.com/apiwit1234/MD-READER/releases/latest/download/';

/**
 * Velopack-backed updater behind a small testable facade.
 * createUpdater({ isPackaged, makeManager, onProgress, log }) ->
 *   { check, download, installAndRestart, installOnQuit, hasPending }
 *
 * makeManager is injected so tests never touch real velopack; production
 * wiring passes () => new UpdateManager(UPDATE_URL).
 * State machine: check() stores the UpdateInfo; download() requires it;
 * installAndRestart()/installOnQuit() require a completed download.
 */
function createUpdater({ isPackaged, makeManager, onProgress, log = () => {} }) {
  let manager = null;
  let pendingInfo = null;
  let downloaded = false;

  function unavailableReason() {
    if (!isPackaged) return 'dev build — updates only work in the installed app';
    try {
      if (!manager) manager = makeManager();
      if (!manager.isInstalled()) return 'portable build — download new versions manually';
    } catch (err) {
      log(`updater init failed: ${(err && err.message) || err}`);
      return 'updater unavailable';
    }
    return null;
  }

  async function check() {
    const reason = unavailableReason();
    if (reason) return { ok: false, error: reason };
    try {
      const info = await manager.checkForUpdatesAsync();
      pendingInfo = info || null;
      downloaded = false;
      return { ok: true, version: info ? info.targetFullRelease.version : null };
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) };
    }
  }

  async function download() {
    const reason = unavailableReason();
    if (reason) return { ok: false, error: reason };
    if (!pendingInfo) return { ok: false, error: 'no update available — check first' };
    try {
      await manager.downloadUpdateAsync(pendingInfo, (p) => { if (onProgress) onProgress(p); });
      downloaded = true;
      return { ok: true, version: pendingInfo.targetFullRelease.version };
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) };
    }
  }

  function installAndRestart() {
    if (!downloaded || !pendingInfo) return false;
    try { manager.applyUpdatesAndRestart(pendingInfo); return true; }
    catch (err) { log(`apply failed: ${(err && err.stack) || err}`); return false; }
  }

  function installOnQuit() {
    if (!downloaded || !pendingInfo) return false;
    try { manager.waitExitThenApplyUpdates(pendingInfo); return true; }
    catch (err) { log(`apply-on-quit failed: ${(err && err.stack) || err}`); return false; }
  }

  return { check, download, installAndRestart, installOnQuit, hasPending: () => downloaded };
}

module.exports = { createUpdater, UPDATE_URL };
```

- [ ] **Step 5: Run tests, commit**

Run: `npx vitest run src/lib/__main__/updater.test.ts` — 7 passed.

```bash
git add package.json package-lock.json electron/updater.cjs src/lib/__main__/updater.test.ts
git commit -m "feat(update): velopack-backed updater facade with check/download/apply state machine"
```

---

### Task 2: Wire Velopack into main.cjs + IPC

**Files:**
- Modify: `electron/main.cjs` (top of file + replace the electron-updater block at lines 106-166)
- Modify: `electron/preload.cjs` (`update` group)
- Modify: `src/lib/electron-api.ts` (`update` types)

- [ ] **Step 1: VelopackApp hook at the very top of `main.cjs`**

Before ANY other require/work (Velopack's hooks must run first; they may exit the process during install/update events):

```js
// Velopack startup hook — MUST run before anything else (it handles
// --veloapp-install/-updated/-obsolete/-uninstall events and may exit).
try {
  const { VelopackApp } = require('velopack');
  VelopackApp.build().run();
} catch {
  // dev environment without the packaged runtime — fine.
}
```

- [ ] **Step 2: Replace the electron-updater block (main.cjs:106-166)**

Keep `app:versionInfo` (lines 148-154) untouched. Replace `initAutoUpdate`, `update:install`, `update:check` with:

```js
// --- Auto-update (Velopack + GitHub Releases) ---
const { createUpdater, UPDATE_URL } = require('./updater.cjs');

function broadcast(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    try { w.webContents.send(channel, payload); } catch {}
  }
}

const updater = createUpdater({
  isPackaged: app.isPackaged,
  makeManager: () => {
    const { UpdateManager } = require('velopack');
    return new UpdateManager(UPDATE_URL);
  },
  onProgress: (percent) => broadcast('app:update-progress', percent),
  log: (m) => appendLog('autoUpdate', m),
});

ipcMain.handle('update:check', () => updater.check());
ipcMain.handle('update:download', () => updater.download());
ipcMain.handle('update:install', () => updater.installAndRestart());

// Auto flow on launch (settings.autoUpdate, default true): check, download in
// the background, notify the renderer, apply on quit.
function initAutoUpdate() {
  if (!app.isPackaged) return;
  if (!getSettingsStore().read().autoUpdate) return;
  setTimeout(async () => {
    const c = await updater.check();
    if (!c.ok || !c.version) return;
    broadcast('app:update-available', c.version);
    const d = await updater.download();
    if (!d.ok) return;
    updater.installOnQuit();
    broadcast('app:update-ready', d.version);
  }, 10_000);
}
```

(`initAutoUpdate()` is already invoked from app startup — keep that call site. Remove `electron-updater` from `dependencies` in package.json.)

- [ ] **Step 3: preload.cjs `update` group**

```js
update: {
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),
  onUpdateReady: (cb) => {
    const listener = (_e, version) => cb(version);
    ipcRenderer.on('app:update-ready', listener);
    return () => ipcRenderer.removeListener('app:update-ready', listener);
  },
  onUpdateAvailable: (cb) => {
    const listener = (_e, version) => cb(version);
    ipcRenderer.on('app:update-available', listener);
    return () => ipcRenderer.removeListener('app:update-available', listener);
  },
  onProgress: (cb) => {
    const listener = (_e, percent) => cb(percent);
    ipcRenderer.on('app:update-progress', listener);
    return () => ipcRenderer.removeListener('app:update-progress', listener);
  },
},
```

- [ ] **Step 4: electron-api.ts `update` types**

```ts
update: {
  check: () => Promise<{ ok: boolean; version?: string | null; error?: string }>;
  download: () => Promise<{ ok: boolean; version?: string; error?: string }>;
  install: () => Promise<boolean>;
  onUpdateReady: (cb: (version: string) => void) => () => void;
  onUpdateAvailable: (cb: (version: string) => void) => () => void;
  onProgress: (cb: (percent: number) => void) => () => void;
};
```

- [ ] **Step 5: Verify, commit**

```bash
npx tsc --noEmit && npx vitest run
git add electron/main.cjs electron/preload.cjs src/lib/electron-api.ts package.json package-lock.json
git commit -m "feat(update): velopack IPC wiring — check/download/install with progress events"
```

---

### Task 3: Updates UI — progress bar + Restart & Update

**Files:**
- Modify: `src/components/settings/UpdatesSection.tsx` (full rewrite below)
- Test: `src/components/settings/UpdatesSection.test.tsx`

- [ ] **Step 1: Write the failing tests** (mock `electron-api` with `vi.mock('@/lib/electron-api')`; `hasApi: () => true`)

```tsx
const DEFAULTS = {
  autoUpdate: true, uiSize: 'medium', contentZoom: 100, contextMenuAutoHide: true,
  fontSource: '', fontSplit: false, fontEnglish: '', fontThai: '',
} as const;

function stubApi(overrides: { check?: unknown; download?: unknown } = {}) {
  const api = {
    update: {
      check: vi.fn().mockResolvedValue(overrides.check ?? { ok: true, version: '2.1.0' }),
      download: vi.fn().mockResolvedValue(overrides.download ?? { ok: true, version: '2.1.0' }),
      install: vi.fn().mockResolvedValue(true),
      onUpdateReady: vi.fn().mockReturnValue(() => {}),
      onUpdateAvailable: vi.fn().mockReturnValue(() => {}),
      onProgress: vi.fn().mockReturnValue(() => {}),
    },
  };
  vi.mocked(getApi).mockReturnValue(api as never);
  return api;
}

it('walks check → download → restart happy path', async () => {
  const api = stubApi(); // check resolves {ok:true,version:'2.1.0'}, download resolves {ok:true,version:'2.1.0'}
  render(<UpdatesSection settings={{ ...DEFAULTS, autoUpdate: false }} onUpdateSettings={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: /check for updates/i }));
  expect(await screen.findByText(/v2\.1\.0 available/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /download/i }));
  expect(await screen.findByRole('button', { name: /restart & update/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /restart & update/i }));
  expect(api.update.install).toHaveBeenCalled();
});

it('shows the error from a failed check', async () => {
  const api = stubApi({ check: { ok: false, error: 'offline' } });
  render(<UpdatesSection settings={DEFAULTS} onUpdateSettings={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /check for updates/i }));
  expect(await screen.findByText(/offline/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**, then rewrite the component:

```tsx
// src/components/settings/UpdatesSection.tsx
'use client';
import { useEffect, useState } from 'react';
import { getApi, hasApi, type AppSettings } from '@/lib/electron-api';

type Props = {
  settings: AppSettings | null;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
};

type Phase =
  | { step: 'idle'; note?: string }
  | { step: 'checking' }
  | { step: 'available'; version: string }
  | { step: 'downloading'; version: string; percent: number }
  | { step: 'ready'; version: string }
  | { step: 'error'; message: string };

export function UpdatesSection({ settings, onUpdateSettings }: Props) {
  const [phase, setPhase] = useState<Phase>({ step: 'idle' });

  useEffect(() => {
    if (!hasApi()) return;
    const offProgress = getApi().update.onProgress((percent) =>
      setPhase((p) => (p.step === 'downloading' ? { ...p, percent } : p)),
    );
    const offReady = getApi().update.onUpdateReady((version) => setPhase({ step: 'ready', version }));
    return () => { offProgress(); offReady(); };
  }, []);

  const check = () => {
    setPhase({ step: 'checking' });
    void getApi().update.check().then((r) => {
      if (!r.ok) setPhase({ step: 'error', message: r.error ?? 'Check failed' });
      else if (r.version) setPhase({ step: 'available', version: r.version });
      else setPhase({ step: 'idle', note: 'You are up to date' });
    });
  };

  const download = (version: string) => {
    setPhase({ step: 'downloading', version, percent: 0 });
    void getApi().update.download().then((r) => {
      if (!r.ok) setPhase({ step: 'error', message: r.error ?? 'Download failed' });
      else setPhase({ step: 'ready', version });
    });
  };

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Updates</div>
      <div className="rounded-theme border border-border p-2.5 text-sm">
        <label className="flex items-center justify-between gap-2">
          <span>Automatic updates</span>
          <input
            type="checkbox"
            aria-label="Automatic updates"
            checked={settings?.autoUpdate ?? true}
            disabled={!hasApi() || !settings}
            onChange={(e) => onUpdateSettings({ autoUpdate: e.target.checked })}
          />
        </label>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs text-muted">
            {phase.step === 'idle' && (phase.note ?? 'Updates download as small patches and apply on restart.')}
            {phase.step === 'checking' && 'Checking…'}
            {phase.step === 'available' && `v${phase.version} available`}
            {phase.step === 'downloading' && `Downloading v${phase.version}… ${Math.round(phase.percent)}%`}
            {phase.step === 'ready' && `v${phase.version} ready — restart to apply`}
            {phase.step === 'error' && <span className="text-danger">{phase.message}</span>}
          </span>

          {phase.step === 'available' ? (
            <button type="button" onClick={() => download(phase.version)}
              className="shrink-0 rounded-theme border border-border px-2 py-1 text-xs hover:bg-surface-2">
              Download
            </button>
          ) : phase.step === 'ready' ? (
            <button type="button" onClick={() => void getApi().update.install()}
              className="btn-gradient shrink-0 rounded-theme px-2 py-1 text-xs">
              Restart &amp; Update
            </button>
          ) : (
            <button type="button" disabled={!hasApi() || phase.step === 'checking' || phase.step === 'downloading'}
              onClick={check}
              className="shrink-0 rounded-theme border border-border px-2 py-1 text-xs hover:bg-surface-2 disabled:opacity-40">
              Check for updates
            </button>
          )}
        </div>

        {phase.step === 'downloading' && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar"
            aria-valuenow={Math.round(phase.percent)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width]"
              style={{ width: `${phase.percent}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
```

(If Phase 2 hasn't shipped yet, `btn-gradient`/`accent-2`/`text-danger` fall back: use `bg-accent text-accent-fg` and `text-red-500`.)

- [ ] **Step 3: Run tests, full suite, commit**

```bash
npx vitest run && npx tsc --noEmit
git add src/components/settings/UpdatesSection.tsx src/components/settings/UpdatesSection.test.tsx
git commit -m "feat(update): in-app update UI — check, download progress, restart & update"
```

---

### Task 4: Packaging scripts + electron-builder target cleanup

**Files:**
- Modify: `package.json` (scripts + build.win targets)
- Modify: `docs/RELEASING.md`

- [ ] **Step 1: Developer prerequisite (one-time, documented in RELEASING.md)**

`vpk` is a dotnet global tool on the DEVELOPER machine only: `dotnet tool install -g vpk` (requires .NET 8 SDK). End users need nothing.

- [ ] **Step 2: npm scripts**

```json
"dist:dir": "npm run build:next && cross-env CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder --dir",
"release:pack": "npm run dist:dir && vpk pack --packId PAXReader --packVersion %npm_package_version% --packDir release/win-unpacked --mainExe \"PAX Reader.exe\" --packTitle \"PAX Reader\" --icon build/icon.png --outputDir release/velopack",
"release:publish": "npm run release:pack && vpk upload github --repoUrl https://github.com/apiwit1234/MD-READER --publish --releaseName \"PAX Reader %npm_package_version%\" --tag v%npm_package_version% --outputDir release/velopack"
```

Notes: `%npm_package_version%` works in cmd-based npm scripts on Windows (this project is Windows-only). `vpk upload github` needs a `GITHUB_TOKEN` env var with repo scope (document in RELEASING.md, never commit it). Verify the built exe name in `release/win-unpacked/` — electron-builder names it `${productName}.exe` = `PAX Reader.exe`.

- [ ] **Step 3: Trim electron-builder win targets**

In `package.json` `build.win.target`, keep `portable` only (the `--dir` output feeds vpk; NSIS and zip go away — AFTER the migration release, see Task 6 sequencing):

```json
"target": [ { "target": "portable", "arch": ["x64"] } ]
```

Also remove the `publish` block (electron-updater's GitHub provider) and the `nsis` block.

- [ ] **Step 4: Rewrite `docs/RELEASING.md`**

Sections: prerequisites (.NET 8 SDK + `dotnet tool install -g vpk` + `GITHUB_TOKEN`), release steps (`npm version patch|minor` → `npm run release:publish` → verify GitHub release has Setup.exe, full + delta .nupkg, RELEASES), user-facing flow (install via Setup.exe; in-app delta updates; portable exe has no auto-update), rollback note (re-publish previous version as a new higher version — Velopack updates forward only).

- [ ] **Step 5: Local pack verification**

Run: `npm run release:pack`
Expected under `release/velopack/`: `PAXReader-win-Setup.exe`, `PAXReader-<version>-full.nupkg`, `RELEASES`. Install the Setup.exe on the dev machine → app launches → terminal works (node-pty survived packing) → `%LOCALAPPDATA%\PAXReader` exists.

- [ ] **Step 6: Commit**

```bash
git add package.json docs/RELEASING.md
git commit -m "feat(release): vpk pack/publish pipeline; portable-only electron-builder target"
```

---

### Task 5: Delta update end-to-end verification (local feed)

No code — proves the update path before touching real users. Velopack's UpdateManager accepts a local directory path as the feed, so this needs no GitHub.

- [ ] **Step 1:** Build v-current: `npm run release:pack`; copy `release/velopack/*` to `C:\temp\paxfeed`.
- [ ] **Step 2:** Install from `C:\temp\paxfeed\PAXReader-win-Setup.exe`.
- [ ] **Step 3:** Temporarily point `UPDATE_URL` in `electron/updater.cjs` to `C:\\temp\\paxfeed` (a local path is valid), bump version (`npm version patch --no-git-tag-version`), make a visible change (e.g. bump a settings label), `npm run release:pack`, copy the NEW artifacts into `C:\temp\paxfeed` (vpk generates the delta against the previous full package found in `--outputDir` — keep packing into the same dir so deltas chain).
- [ ] **Step 4:** In the installed app: Settings → Updates → Check → version appears → Download (progress bar moves; delta .nupkg is small) → Restart & Update → app relaunches on the new version; settings, fonts, opened folders all intact; terminal works.
- [ ] **Step 5:** Revert `UPDATE_URL` and the throwaway version bump (`git checkout -- .` for unstaged throwaway changes). Document the local-feed test recipe in RELEASING.md ("Testing updates locally").
- [ ] **Step 6:** Commit doc change: `git commit -am "docs(release): local-feed update testing recipe"`

---

### Task 6: NSIS → Velopack migration (one release, UI-only for users)

**Files:**
- Create: `electron/migrate-nsis.cjs`
- Modify: `electron/main.cjs` (startup call), `src/app/page.tsx` (migration prompt toast/dialog), `electron/preload.cjs` + `src/lib/electron-api.ts` (two small IPC entries)
- Test: `src/lib/__main__/migrate-nsis.test.ts`

**Release sequencing (the critical part):**

1. Tag the migration release (e.g. `v1.1.0`). Build it TWICE: once with the OLD pipeline (`npm run dist` with NSIS target + publish block still present on a temporary branch state) and once with the new (`release:publish`). Upload BOTH artifact sets to the same GitHub release. Existing NSIS installs auto-update to v1.1.0-NSIS via electron-updater (its config still exists in their old app); fresh users get Setup.exe.
2. v1.1.0 code contains BOTH the Velopack updater (Tasks 1-3) AND the migration module below. electron-updater stays in v1.1.0's dependencies so the old-style update metadata (`latest.yml`) remains valid; it is removed in the release after.
3. From `v1.1.1` on: Velopack artifacts only.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__main__/migrate-nsis.test.ts
import { describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { detectInstallKind, buildMigrationPlan } = require('../../../electron/migrate-nsis.cjs');

describe('detectInstallKind', () => {
  it('reports velopack when the Velopack marker exists next to the exe dir', () => {
    // Velopack layout: <root>\Update.exe + <root>\current\<app files>
    const exists = (p: string) => p.replace(/\\/g, '/').endsWith('/Update.exe');
    expect(detectInstallKind('C:/Users/u/AppData/Local/PAXReader/current/PAX Reader.exe', exists)).toBe('velopack');
  });

  it('reports nsis when the NSIS uninstaller exists in the exe dir', () => {
    const exists = (p: string) => p.replace(/\\/g, '/').endsWith('/Uninstall PAX Reader.exe');
    expect(detectInstallKind('C:/Users/u/AppData/Local/Programs/PAX Reader/PAX Reader.exe', exists)).toBe('nsis');
  });

  it('reports none for portable/dev (neither marker)', () => {
    expect(detectInstallKind('C:/some/dir/PAX Reader.exe', () => false)).toBe('none');
  });
});

describe('buildMigrationPlan', () => {
  it('downloads setup, runs it silently, then uninstalls old silently', () => {
    const plan = buildMigrationPlan('C:/Users/u/AppData/Local/Programs/PAX Reader');
    expect(plan.setupUrl).toBe('https://github.com/apiwit1234/MD-READER/releases/latest/download/PAXReader-win-Setup.exe');
    expect(plan.setupArgs).toEqual(['--silent']);
    expect(plan.uninstallExe).toBe('C:/Users/u/AppData/Local/Programs/PAX Reader/Uninstall PAX Reader.exe');
    expect(plan.uninstallArgs).toEqual(['/S']);
  });
});
```

- [ ] **Step 2: Run to verify FAIL, then implement**

```js
// electron/migrate-nsis.cjs
'use strict';
const path = require('path');

const SETUP_URL = 'https://github.com/apiwit1234/MD-READER/releases/latest/download/PAXReader-win-Setup.exe';
const NSIS_UNINSTALLER = 'Uninstall PAX Reader.exe';

/**
 * Classify how this copy of the app is installed.
 * - velopack: exe lives in <root>\current\, with <root>\Update.exe
 * - nsis: the NSIS uninstaller sits next to the exe
 * - none: portable / dev
 * existsFn injected for tests (production passes fs.existsSync).
 */
function detectInstallKind(exePath, existsFn) {
  const exeDir = path.dirname(exePath);
  const parent = path.dirname(exeDir);
  if (path.basename(exeDir).toLowerCase() === 'current' &&
      existsFn(path.join(parent, 'Update.exe'))) return 'velopack';
  if (existsFn(path.join(exeDir, NSIS_UNINSTALLER))) return 'nsis';
  return 'none';
}

/** Pure data: what the migration runner must do, in order. */
function buildMigrationPlan(nsisInstallDir) {
  return {
    setupUrl: SETUP_URL,
    setupArgs: ['--silent'],
    uninstallExe: `${nsisInstallDir.replace(/\\/g, '/')}/${NSIS_UNINSTALLER}`,
    uninstallArgs: ['/S'],
  };
}

module.exports = { detectInstallKind, buildMigrationPlan, SETUP_URL };
```

- [ ] **Step 3: Runner + IPC in main.cjs**

```js
const { detectInstallKind, buildMigrationPlan } = require('./migrate-nsis.cjs');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');

ipcMain.handle('migrate:detect', () => {
  if (!app.isPackaged) return 'none';
  return detectInstallKind(process.execPath, fs.existsSync);
});

// Download Setup.exe to temp, run it silently, uninstall the NSIS copy, quit.
// Order matters: never remove the old install before the new Setup exits 0.
ipcMain.handle('migrate:run', async () => {
  const kind = detectInstallKind(process.execPath, fs.existsSync);
  if (kind !== 'nsis') return { ok: false, error: 'not an NSIS install' };
  const plan = buildMigrationPlan(path.dirname(process.execPath));
  const setupPath = path.join(app.getPath('temp'), 'PAXReader-win-Setup.exe');
  try {
    await downloadFollowingRedirects(plan.setupUrl, setupPath); // helper below
    const code = await new Promise((resolve) => {
      const child = spawn(setupPath, plan.setupArgs, { detached: false, stdio: 'ignore' });
      child.on('exit', resolve);
      child.on('error', () => resolve(-1));
    });
    if (code !== 0) return { ok: false, error: `setup exited with ${code}` };
    // New install verified; remove the old one and exit. The uninstaller is
    // detached so it survives our process exiting.
    spawn(plan.uninstallExe, plan.uninstallArgs, { detached: true, stdio: 'ignore' }).unref();
    setTimeout(() => app.quit(), 500);
    return { ok: true };
  } catch (err) {
    appendLog('migrate', String((err && err.stack) || err));
    return { ok: false, error: String((err && err.message) || err) };
  }
});

function downloadFollowingRedirects(url, dest, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('too many redirects'));
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(downloadFollowingRedirects(res.headers.location, dest, depth + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => out.close(() => resolve(undefined)));
      out.on('error', reject);
    }).on('error', reject);
  });
}
```

preload.cjs: `migrate: { detect: () => ipcRenderer.invoke('migrate:detect'), run: () => ipcRenderer.invoke('migrate:run') }`; matching types in electron-api.ts: `migrate: { detect: () => Promise<'velopack' | 'nsis' | 'none'>; run: () => Promise<{ ok: boolean; error?: string }> }`.

- [ ] **Step 4: Renderer prompt** (page.tsx, near the update-ready toast effect ~line 551)

```tsx
useEffect(() => {
  if (!hasApi()) return;
  void getApi().migrate.detect().then((kind) => {
    if (kind !== 'nsis') return;
    showToast('PAX Reader is switching to a faster update system', {
      actionLabel: 'Upgrade now',
      onAction: () => {
        showToast('Upgrading — the app will restart by itself…');
        void getApi().migrate.run().then((r) => {
          if (!r.ok) showToast(`Upgrade failed: ${r.error} — will retry next launch`);
        });
      },
    });
  });
}, []);
```

(Match the real `showToast` signature in page.tsx — if it has no action support, render the prompt as a small dismissible banner component above the tab bar instead; keep the same copy and the two calls.)

- [ ] **Step 5: Run all tests, commit**

```bash
npx tsc --noEmit && npx vitest run
git add electron/migrate-nsis.cjs electron/main.cjs electron/preload.cjs src/lib/electron-api.ts src/app/page.tsx src/lib/__main__/migrate-nsis.test.ts
git commit -m "feat(update): one-click NSIS-to-Velopack migration"
```

- [ ] **Step 6: Migration dry run on a VM/spare machine**

Install the OLD v1.0.x NSIS build → run the new build over it (simulate the auto-update by installing v1.1.0-NSIS manually) → click "Upgrade now" → verify: Velopack copy installed and launches, old Start-Menu entry gone, `%APPDATA%` settings intact.

---

### Task 7: Final cleanup release (post-migration)

Executed as the FIRST release after v1.1.0 has been out:

- [ ] **Step 1:** Remove `electron-updater` from dependencies; delete any remaining electron-updater references (`appendLog('autoUpdate', ...)` block remnants, `electron/installer.nsh`, `build.nsis` config).
- [ ] **Step 2:** `npx tsc --noEmit && npx vitest run && npm run release:pack` — clean.
- [ ] **Step 3:** Update README install/update section (Setup.exe download, automatic delta updates, portable exe note).
- [ ] **Step 4:** Commit:

```bash
git add -A
git commit -m "chore(update): remove NSIS/electron-updater leftovers after velopack migration"
```
