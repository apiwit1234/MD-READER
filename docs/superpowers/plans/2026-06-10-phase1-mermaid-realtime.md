# Phase 1: Mermaid Reliability + Real-Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mermaid diagrams render reliably (keep last good render on error, show useful errors, normalize broken input), re-render in <300ms when a file is saved on disk, and standalone `.mmd`/`.mermaid` files open as first-class diagram tabs.

**Architecture:** A new source-normalization lib feeds a hardened retry chain in `MermaidBlock`. A new per-file watcher IPC channel (`fs:watchFile`) bypasses the 1200ms folder-wide debounce for open tabs. `.mmd` files flow through the existing tree/read/tab pipeline with a new full-pane `DiagramView`.

**Tech Stack:** Electron (main: CommonJS), Next.js 14 + React 18, mermaid 11.x, vitest + happy-dom + @testing-library/react.

**Conventions:** Spec at `docs/superpowers/specs/2026-06-10-pax-reader-2.0-revamp-design.md`. Run tests with `npx vitest run <file>`. All paths relative to repo root.

---

### Task 1: Mermaid source normalization lib

**Files:**
- Create: `src/lib/mermaid-normalize.ts`
- Test: `src/lib/mermaid-normalize.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/mermaid-normalize.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeMermaidSource } from './mermaid-normalize';

describe('normalizeMermaidSource', () => {
  it('strips a UTF-8 BOM', () => {
    expect(normalizeMermaidSource('﻿graph LR; A-->B')).toBe('graph LR; A-->B');
  });

  it('normalizes CRLF and lone CR to LF', () => {
    expect(normalizeMermaidSource('graph LR\r\nA-->B\rB-->C')).toBe('graph LR\nA-->B\nB-->C');
  });

  it('replaces smart quotes with ASCII quotes', () => {
    expect(normalizeMermaidSource('graph LR; A["“hi”"] --> B[‘x’]'))
      .toBe('graph LR; A[""hi""] --> B[\'x\']');
  });

  it('trims trailing whitespace per line', () => {
    expect(normalizeMermaidSource('graph LR;   \nA-->B  ')).toBe('graph LR;\nA-->B');
  });

  it('returns input unchanged when already clean', () => {
    const src = 'graph LR\nA-->B';
    expect(normalizeMermaidSource(src)).toBe(src);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/mermaid-normalize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/mermaid-normalize.ts
/**
 * Whole-source cleanup applied as a retry pass when a mermaid render fails:
 * BOM, Windows/old-Mac line endings, word-processor smart quotes and
 * trailing whitespace all break mermaid's parser in hard-to-see ways.
 * Distinct from normalizeMermaidEntities (HTML entities inside labels).
 */
export function normalizeMermaidSource(source: string): string {
  return source
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/mermaid-normalize.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mermaid-normalize.ts src/lib/mermaid-normalize.test.ts
git commit -m "feat(mermaid): source normalization pass (BOM, CRLF, smart quotes, trailing ws)"
```

---

### Task 2: MermaidBlock — keep last good render, error panel, retry chain

**Files:**
- Modify: `src/components/MermaidBlock.tsx`
- Test: `src/components/MermaidBlock.test.tsx` (add cases; keep existing ones passing)

Behavior change: on render failure the component no longer swaps to an error-only box. It keeps the previous good SVG visible with a "stale" badge and a collapsible error panel. Only when there has never been a good render does it show error + source. Retry order on failure: (1) `normalizeMermaidEntities`, (2) `normalizeMermaidSource`, (3) both combined.

- [ ] **Step 1: Write the failing tests** (append to `src/components/MermaidBlock.test.tsx`; mock mermaid the same way the existing tests in that file do — reuse the file's existing `vi.mock('mermaid', ...)` and make `render` reject/resolve per source content)

```tsx
it('keeps the last good SVG and shows a stale badge when the source turns invalid', async () => {
  const { rerender } = render(<MermaidBlock source="graph LR; A-->B" theme="light" />);
  await screen.findByText(/scroll to zoom/i);

  rerender(<MermaidBlock source="bad" theme="light" />);

  expect(await screen.findByText(/stale/i)).toBeInTheDocument();
  expect(screen.queryByText(/Diagram failed to render/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /show error/i })).toBeInTheDocument();
});

it('expands the error panel with the mermaid message on click', async () => {
  const { rerender } = render(<MermaidBlock source="graph LR; A-->B" theme="light" />);
  await screen.findByText(/scroll to zoom/i);
  rerender(<MermaidBlock source="bad" theme="light" />);

  fireEvent.click(await screen.findByRole('button', { name: /show error/i }));

  expect(await screen.findByText(/parse error|render error|bad/i)).toBeInTheDocument();
});

it('retries with normalizeMermaidSource when the raw source fails', async () => {
  // CRLF source: first render rejects, normalized (LF) succeeds — mock accordingly.
  render(<MermaidBlock source={'graph LR\r\nA-->B'} theme="light" />);
  expect(await screen.findByText(/scroll to zoom/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/components/MermaidBlock.test.tsx`
Expected: new tests FAIL, existing tests still meaningful (the "shows error box" existing test will need updating in Step 3 — bad-first source still shows the error box, so it should keep passing).

- [ ] **Step 3: Implement in `MermaidBlock.tsx`**

Replace the render effect (currently lines 89-125) and the error-only early return (lines 179-197) with:

```tsx
// New state alongside the existing ones:
const [renderError, setRenderError] = useState<string | null>(null);
const [showError, setShowError] = useState(false);
// svgMarkup keeps the LAST GOOD render; renderError != null means it is stale.

async function renderWithRetries(id: string, src: string): Promise<string> {
  const attempts: string[] = [src];
  const entities = normalizeMermaidEntities(src);
  if (entities !== src) attempts.push(entities);
  const normalized = normalizeMermaidSource(src);
  if (normalized !== src) attempts.push(normalized);
  const both = normalizeMermaidEntities(normalized);
  if (both !== normalized && both !== entities) attempts.push(both);
  let lastErr: Error = new Error('render error');
  for (let i = 0; i < attempts.length; i++) {
    try {
      const { svg } = await mermaid.render(`${id}-a${i}`, attempts[i]);
      return svg;
    } catch (e) {
      lastErr = e as Error;
    }
  }
  throw lastErr;
}

useEffect(() => {
  mermaid.initialize({
    startOnLoad: false,
    theme: themeMode(theme) === 'dark' ? 'dark' : 'default',
    securityLevel: 'strict',
  });
  let cancelled = false;
  const id = `mmd-${++idCounter.n}`;
  renderWithRetries(id, source)
    .then((svg) => {
      if (cancelled) return;
      setSvgMarkup(svg);
      setRenderError(null);
      setShowError(false);
    })
    .catch((e) => {
      if (cancelled) return;
      const msg = (e as Error).message || 'render error';
      setRenderError(msg); // svgMarkup intentionally NOT cleared — stale view
      reportMermaidError(msg, source);
    });
  return () => { cancelled = true; };
}, [source, theme]);
```

Note: mermaid 11's failed `render` can leave an orphan error element in `document.body` with the attempt id; the per-attempt ids (`-a0`, `-a1`, …) keep them unique, and `mermaid.render` removes its temp element on success. Add `document.getElementById(`d${id}-a${i}`)?.remove();` in the catch inside the loop if the suite shows leftovers.

JSX: keep the normal diagram layout always rendered when `svgMarkup` exists. Header gains a stale badge + error toggle when `renderError` is set:

```tsx
{renderError && (
  <span className="flex items-center gap-1">
    <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold text-warn">
      stale — source has an error
    </span>
    <button type="button" onClick={() => setShowError((v) => !v)}
      className="rounded px-2 py-0.5 hover:bg-surface-2"
      aria-label={showError ? 'Hide error' : 'Show error'}>
      {showError ? 'Hide error' : 'Show error'}
    </button>
  </span>
)}
```

Collapsible panel under the diagram container (inside the bordered card):

```tsx
{renderError && showError && (
  <div className="border-t border-border bg-surface-2 p-2 font-mono text-xs text-fg">
    {renderError}
  </div>
)}
```

The error-only branch (no good render yet) keeps the existing error box JSX but is now conditioned on `renderError && !svgMarkup` instead of `error`. Remove the old `error` state. If `bg-warn-soft`/`text-warn` Tailwind tokens don't exist yet (they arrive in Phase 2), use `bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200` for now.

- [ ] **Step 4: Run the full mermaid test files**

Run: `npx vitest run src/components/MermaidBlock.test.tsx src/components/MarkdownView.test.tsx src/lib/mermaid-types.test.ts`
Expected: all pass. Update the pre-existing "shows error box" test only if its assertions referenced removed markup.

- [ ] **Step 5: Commit**

```bash
git add src/components/MermaidBlock.tsx src/components/MermaidBlock.test.tsx
git commit -m "feat(mermaid): keep last good render on error, collapsible error panel, normalization retry chain"
```

---

### Task 3: Upgrade mermaid to latest 11.x

**Files:**
- Modify: `package.json` (devDependencies), `package-lock.json`

- [ ] **Step 1: Upgrade**

Run: `npm install --save-dev mermaid@^11`
Then: `npm ls mermaid` — confirm a single 11.x version.

- [ ] **Step 2: Run the whole suite**

Run: `npx vitest run`
Expected: all pass — `src/lib/mermaid-types.test.ts` exercises one sample per diagram type and is the upgrade canary. If a diagram type fails, fix the fixture only if mermaid changed its grammar (check the mermaid 11 release notes for that type); otherwise treat as a real regression and pin the previous minor.

- [ ] **Step 3: Manual smoke** (dev app)

Run: `npm run dev` — open a markdown file with flowchart + sequence + class diagrams; verify render, pan/zoom, fullscreen.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): upgrade mermaid to latest 11.x"
```

---

### Task 4: Per-file watcher registry (main process, testable module)

**Files:**
- Create: `electron/file-watchers.cjs`
- Test: `src/lib/__main__/file-watchers.test.ts` (vitest can import .cjs; node-style test, no DOM needed)

A small registry factory with injected `watchFn` so debounce/refcount/re-arm logic is unit-testable without real fs.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__main__/file-watchers.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createFileWatcherRegistry } = require('../../../electron/file-watchers.cjs');

type Handler = (event: string, filename: string | null) => void;

function makeFakeWatch() {
  const handlers = new Map<string, Handler>();
  const closed: string[] = [];
  const watchFn = (p: string, _opts: unknown, cb: Handler) => {
    handlers.set(p, cb);
    return { close: () => closed.push(p), on: () => {} };
  };
  return { handlers, closed, watchFn };
}

describe('createFileWatcherRegistry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces change events to a single callback', () => {
    const { handlers, watchFn } = makeFakeWatch();
    const onChange = vi.fn();
    const reg = createFileWatcherRegistry({ watchFn, debounceMs: 150, onChange });
    reg.watch('C:/a/file.md');
    handlers.get('C:/a/file.md')!('change', 'file.md');
    handlers.get('C:/a/file.md')!('change', 'file.md');
    vi.advanceTimersByTime(149);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('C:/a/file.md');
  });

  it('refcounts: second watch reuses, unwatch closes only at zero', () => {
    const { watchFn, closed } = makeFakeWatch();
    const reg = createFileWatcherRegistry({ watchFn, debounceMs: 150, onChange: vi.fn() });
    reg.watch('C:/a/file.md');
    reg.watch('C:/a/file.md');
    reg.unwatch('C:/a/file.md');
    expect(closed).toHaveLength(0);
    reg.unwatch('C:/a/file.md');
    expect(closed).toEqual(['C:/a/file.md']);
  });

  it('re-arms the watcher after a rename event (atomic save)', () => {
    const { handlers, watchFn, closed } = makeFakeWatch();
    const onChange = vi.fn();
    const reg = createFileWatcherRegistry({ watchFn, debounceMs: 150, onChange });
    reg.watch('C:/a/file.md');
    handlers.get('C:/a/file.md')!('rename', 'file.md');
    vi.advanceTimersByTime(200);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(closed).toContain('C:/a/file.md'); // old watcher closed and replaced
    handlers.get('C:/a/file.md')!('change', 'file.md'); // new handler installed
    vi.advanceTimersByTime(200);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('watch returns false when watchFn throws (missing file)', () => {
    const reg = createFileWatcherRegistry({
      watchFn: () => { throw new Error('ENOENT'); },
      debounceMs: 150,
      onChange: vi.fn(),
    });
    expect(reg.watch('C:/missing.md')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__main__/file-watchers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// electron/file-watchers.cjs
'use strict';

/**
 * Per-FILE watcher registry for open tabs. Unlike the folder watcher in
 * main.cjs (recursive, 1200ms debounce, tree-oriented), this targets a single
 * file with a short debounce so saves re-render in <300ms. Editors that save
 * atomically (write temp + rename) emit 'rename'; the watcher then points at
 * a dead inode, so we close and re-arm it on the same path.
 *
 * createFileWatcherRegistry({ watchFn, debounceMs, onChange }) -> { watch, unwatch, dispose }
 *   watchFn: fs.watch-compatible (path, opts, listener) => watcher  [injected for tests]
 *   onChange(absPath): fired once per debounce window
 */
function createFileWatcherRegistry({ watchFn, debounceMs, onChange }) {
  const entries = new Map(); // absPath -> { watcher, count, timer }

  function arm(absPath) {
    const watcher = watchFn(absPath, {}, (event) => {
      const entry = entries.get(absPath);
      if (!entry) return;
      if (event === 'rename') rearm(absPath, entry);
      if (entry.timer) clearTimeout(entry.timer);
      entry.timer = setTimeout(() => {
        entry.timer = null;
        onChange(absPath);
      }, debounceMs);
    });
    if (watcher.on) watcher.on('error', () => {});
    return watcher;
  }

  function rearm(absPath, entry) {
    try { entry.watcher.close(); } catch {}
    try { entry.watcher = arm(absPath); } catch { /* file gone; next watch() recreates */ }
  }

  function watch(absPath) {
    const existing = entries.get(absPath);
    if (existing) { existing.count++; return true; }
    let watcher;
    try { watcher = arm(absPath); } catch { return false; }
    entries.set(absPath, { watcher, count: 1, timer: null });
    return true;
  }

  function unwatch(absPath) {
    const entry = entries.get(absPath);
    if (!entry) return;
    entry.count--;
    if (entry.count > 0) return;
    try { entry.watcher.close(); } catch {}
    if (entry.timer) clearTimeout(entry.timer);
    entries.delete(absPath);
  }

  function dispose() {
    for (const p of [...entries.keys()]) { entries.get(p).count = 1; unwatch(p); }
  }

  return { watch, unwatch, dispose };
}

module.exports = { createFileWatcherRegistry };
```

(`rearm` closes the dead watcher and `arm`s a fresh one on the same path — both are hoisted function declarations, so the mutual reference is fine.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__main__/file-watchers.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add electron/file-watchers.cjs src/lib/__main__/file-watchers.test.ts
git commit -m "feat(fs): per-file watcher registry with short debounce, refcount, rename re-arm"
```

---

### Task 5: Wire `fs:watchFile` IPC through main, preload, and the typed bridge

**Files:**
- Modify: `electron/main.cjs` (after the folder-watch block, ~line 419)
- Modify: `electron/preload.cjs` (inside the `fs` group, after `onChanged`)
- Modify: `src/lib/electron-api.ts` (the `fs` type, after `onChanged`)

- [ ] **Step 1: main.cjs — registry instance + handlers**

Add near the folder-watcher section:

```js
const { createFileWatcherRegistry } = require('./file-watchers.cjs');

// Per-open-tab file watchers: instant (150ms) save-to-render path, separate
// from the 1200ms folder watcher that refreshes trees.
const fileWatchers = createFileWatcherRegistry({
  watchFn: fsWatch,
  debounceMs: 150,
  onChange: (absPath) => {
    for (const w of BrowserWindow.getAllWindows()) {
      try { w.webContents.send('fs:fileChanged', absPath); } catch {}
    }
  },
});

ipcMain.handle('fs:watchFile', (_e, absPath) => {
  if (typeof absPath !== 'string' || !absPath) return false;
  return fileWatchers.watch(absPath);
});
ipcMain.handle('fs:unwatchFile', (_e, absPath) => {
  if (typeof absPath === 'string' && absPath) fileWatchers.unwatch(absPath);
});
```

(`fsWatch` is already imported at the top of main.cjs for the folder watcher.)

- [ ] **Step 2: preload.cjs — bridge methods** (inside the `fs: { ... }` object)

```js
watchFile: (absPath) => ipcRenderer.invoke('fs:watchFile', absPath),
unwatchFile: (absPath) => ipcRenderer.invoke('fs:unwatchFile', absPath),
onFileChanged: (cb) => {
  const listener = (_e, absPath) => cb(absPath);
  ipcRenderer.on('fs:fileChanged', listener);
  return () => ipcRenderer.removeListener('fs:fileChanged', listener);
},
```

- [ ] **Step 3: electron-api.ts — types** (in the `fs` section of `MdReader`)

```ts
watchFile: (absPath: string) => Promise<boolean>;
unwatchFile: (absPath: string) => Promise<void>;
onFileChanged: (cb: (absPath: string) => void) => () => void;
```

- [ ] **Step 4: Type-check and test**

Run: `npx tsc --noEmit` then `npx vitest run`
Expected: clean / all pass.

- [ ] **Step 5: Commit**

```bash
git add electron/main.cjs electron/preload.cjs src/lib/electron-api.ts
git commit -m "feat(fs): fs:watchFile IPC — per-file change events for open tabs"
```

---

### Task 6: Renderer — refresh a single path on `fs:fileChanged`

**Files:**
- Modify: `src/app/page.tsx`

The active-file refresh logic already exists inside `liveReloadRef.current` (page.tsx:307-353). Extract it into a path-parameterized helper and drive it from both the folder event (active file, as today) and the new per-file event (any open tab's file, no root scoping).

- [ ] **Step 1: Extract `refreshPathRef`**

Above `liveReloadRef`, add:

```tsx
// Refresh one absolute path from disk (used by both folder-level live reload
// for the active file and the per-file watcher for any open tab).
const refreshPathRef = useRef<(absPath: string) => void>(() => {});
```

After the `liveReloadRef.current = ...` assignment block, assign `refreshPathRef.current` with the body currently at page.tsx:311-353 (the part starting at `setUpdatingPaths(...)` through the `.catch`), with `activeAbs` renamed to the `absPath` parameter throughout. Then replace those lines inside `liveReloadRef.current` with:

```tsx
if (!activeAbs || !isUnderRoot(activeAbs, root)) return;
refreshPathRef.current(activeAbs);
```

Behavior note: the extracted body uses `contentCache[absPath]`, `store`, `reloadAction`, `conflictToastRef`, `showToast` exactly as before — no logic change, only the path is now a parameter.

- [ ] **Step 2: Register per-file watchers for open tabs**

Add an effect near the folder-watch effect (page.tsx:276-281). Open tabs' absolute paths come from the same resolution the page already uses for reading (folder.hostPath + relativePath for non-virtual folders; skip virtual folders and synthetic `mermaid`/`diff` tabs):

```tsx
// Per-file watchers: every real-file open tab gets instant change events.
const tabFileKey = state.openTabs
  .filter((t) => !t.kind || t.kind === 'file')
  .map((t) => {
    const f = state.openedFolders.find((x) => x.id === t.folderId);
    return f && !f.isVirtual ? joinHostPath(f.hostPath, t.relativePath) : null;
  })
  .filter((p): p is string => !!p)
  .join('|');
useEffect(() => {
  if (!hasApi() || !tabFileKey) return;
  const paths = tabFileKey.split('|');
  paths.forEach((p) => { void getApi().fs.watchFile(p); });
  return () => { paths.forEach((p) => { void getApi().fs.unwatchFile(p); }); };
}, [tabFileKey]);

// One-time subscription mirroring fs.onChanged below.
useEffect(() => {
  if (!hasApi()) return;
  const off = getApi().fs.onFileChanged((absPath) => refreshPathRef.current(absPath));
  return () => { off(); };
}, []);
```

`joinHostPath` — page.tsx already builds host paths from folder + relativePath somewhere near the read logic; reuse that exact existing helper (search for where `fs.read` gets its argument built from a tab). If it's inline, extract it as `joinHostPath(hostPath, relativePath)` in the same file and use it in both places. Do not invent a second join implementation.

- [ ] **Step 3: De-duplicate double refresh**

The folder watcher (1200ms) will also fire for the same save. Since `refreshPath` is idempotent (`reloadAction` returns `'ignore'` when disk content matches the cache), the second refresh is a cheap no-op read. No further guard needed — verify in Step 4 that no double toast/spinner flicker occurs.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Open a folder, open a .md with a mermaid block, edit + save it in another editor (VS Code).
Expected: diagram re-renders well under a second (~150ms debounce + read + render), tab spinner blips once, no duplicate "file changed" toasts. With unsaved local edits, the conflict toast still appears once.

- [ ] **Step 5: Run suite, type-check, commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/app/page.tsx
git commit -m "feat(reload): instant per-file refresh for open tabs via fs:fileChanged"
```

---

### Task 7: Standalone `.mmd`/`.mermaid` files as diagram tabs

**Files:**
- Modify: `electron/main.cjs:309` (tree filter)
- Create: `src/components/DiagramView.tsx`
- Modify: `src/app/page.tsx` (extension gates at lines ~425 and ~921; render branch ~993-1006)
- Modify: `src/types.ts` (comment only — `kind` stays `'file' | 'mermaid' | 'diff'`; a .mmd file tab is `kind: 'file'`)
- Test: `src/components/DiagramView.test.tsx`

- [ ] **Step 1: Shared extension helper + failing tests**

Create `src/lib/file-kinds.ts`:

```ts
export function isMarkdownPath(p: string): boolean {
  const l = p.toLowerCase();
  return l.endsWith('.md') || l.endsWith('.markdown');
}

export function isMermaidPath(p: string): boolean {
  const l = p.toLowerCase();
  return l.endsWith('.mmd') || l.endsWith('.mermaid');
}
```

Test `src/lib/file-kinds.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isMarkdownPath, isMermaidPath } from './file-kinds';

describe('file kinds', () => {
  it('detects markdown', () => {
    expect(isMarkdownPath('a/B.MD')).toBe(true);
    expect(isMarkdownPath('a/b.markdown')).toBe(true);
    expect(isMarkdownPath('a/b.mmd')).toBe(false);
  });
  it('detects mermaid files', () => {
    expect(isMermaidPath('x/flow.mmd')).toBe(true);
    expect(isMermaidPath('x/flow.MERMAID')).toBe(true);
    expect(isMermaidPath('x/flow.md')).toBe(false);
  });
});
```

Run: `npx vitest run src/lib/file-kinds.test.ts` → FAIL → implement → PASS.

- [ ] **Step 2: Show .mmd files in the sidebar tree**

`electron/main.cjs:309` — change:

```js
} else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
```

to:

```js
} else if (entry.isFile() && /\.(md|markdown|mmd|mermaid)$/i.test(entry.name)) {
```

(Also covers `.markdown`, which the renderer already accepted at page.tsx:921 but the tree previously hid.)

- [ ] **Step 3: DiagramView component + failing test**

```tsx
// src/components/DiagramView.tsx
'use client';
import { useState } from 'react';
import type { Theme } from '@/types';
import { MermaidBlock } from './MermaidBlock';

type Props = {
  source: string;
  theme: Theme;
  onRendered?: () => void;
};

/** Full-pane view for standalone .mmd/.mermaid files: the whole file is one
 *  diagram, with a Source toggle for reading the raw text. */
export function DiagramView({ source, theme, onRendered }: Props) {
  const [showSource, setShowSource] = useState(false);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-1 border-b border-border px-2 py-1 text-xs">
        <button
          type="button"
          onClick={() => setShowSource(false)}
          aria-pressed={!showSource}
          className={`rounded px-2 py-0.5 ${!showSource ? 'bg-accent text-accent-fg' : 'hover:bg-surface-2'}`}
        >
          Diagram
        </button>
        <button
          type="button"
          onClick={() => setShowSource(true)}
          aria-pressed={showSource}
          className={`rounded px-2 py-0.5 ${showSource ? 'bg-accent text-accent-fg' : 'hover:bg-surface-2'}`}
        >
          Source
        </button>
      </div>
      {showSource ? (
        <pre className="flex-1 overflow-auto bg-surface p-3 font-mono text-sm text-fg">{source}</pre>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-2">
          <MermaidBlock source={source} theme={theme} onRendered={onRendered} />
        </div>
      )}
    </div>
  );
}
```

Test `src/components/DiagramView.test.tsx` (reuse the mermaid mock pattern from `MermaidBlock.test.tsx`):

```tsx
it('renders the diagram by default and toggles to source', async () => {
  render(<DiagramView source="graph LR; A-->B" theme="light" />);
  expect(await screen.findByText(/scroll to zoom/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Source' }));
  expect(screen.getByText('graph LR; A-->B')).toBeInTheDocument();
});
```

Run targeted test → FAIL → implement → PASS.

- [ ] **Step 4: page.tsx wiring**

1. Line ~425 (`app:onOpenFile` gate `if (!filePath.toLowerCase().endsWith('.md')) return;`) — replace with `if (!isMarkdownPath(filePath) && !isMermaidPath(filePath)) return;` (import both from `@/lib/file-kinds`).
2. Line ~921 (open-from-sidebar gate `if (mode === 'md' && !lower.endsWith('.md') && !lower.endsWith('.markdown'))`) — allow mermaid paths too: `if (mode === 'md' && !isMarkdownPath(p) && !isMermaidPath(p))`.
3. In the content render branch (~993-1006) where `isMermaid` (synthetic tab) selects the full-pane mermaid view: add a sibling condition — when the active tab is `kind: 'file'` and `isMermaidPath(relativePath)`, render `<DiagramView source={content} theme={state.theme} />` instead of `MarkdownView`. The content arrives through the normal `fs:read` flow, so the Task 6 per-file watcher gives .mmd files real-time re-render with zero extra code.
4. `isMdVisible` (line 81) — include mermaid paths so .mmd tabs stay visible in `md` mode.

- [ ] **Step 5: File association for `.mmd`**

`package.json` → `build.fileAssociations` — add:

```json
{ "ext": "mmd", "name": "Mermaid diagram", "description": "Mermaid diagram source", "role": "Viewer" }
```

- [ ] **Step 6: Verify everything**

```bash
npx tsc --noEmit && npx vitest run
```
Manual: `npm run dev` → create `test.mmd` with `graph TD; A-->B` in an opened folder → appears in sidebar → opens as diagram tab → Source toggle works → edit the file externally → diagram updates in real time → break the syntax → stale badge + error panel.

- [ ] **Step 7: Commit**

```bash
git add electron/main.cjs src/lib/file-kinds.ts src/lib/file-kinds.test.ts src/components/DiagramView.tsx src/components/DiagramView.test.tsx src/app/page.tsx package.json
git commit -m "feat(mermaid): standalone .mmd/.mermaid files open as live diagram tabs"
```

---

### Task 8: Full regression + phase wrap-up

- [ ] **Step 1:** `npx tsc --noEmit && npx vitest run && npm run lint` — all clean.
- [ ] **Step 2:** Manual regression: .md tabs render, git panel diff tabs, terminal, search, drag-dropped virtual folders (no per-file watcher, no crash), tear-off windows with a synthetic mermaid tab.
- [ ] **Step 3:** Update `README.md` feature list (mention `.mmd` support + instant reload) and commit:

```bash
git add README.md
git commit -m "docs: phase 1 — mermaid reliability and real-time reload"
```
