'use strict';

/**
 * Per-FILE watcher registry for open tabs. Unlike the folder watcher in
 * main.cjs (recursive, 1200ms debounce, tree-oriented), this targets a single
 * file with a short debounce so saves re-render in <300ms. Editors that save
 * atomically (write temp + rename over target) emit 'rename'; the watcher
 * then points at a dead inode, so we close and re-arm it on the same path.
 *
 * createFileWatcherRegistry({ watchFn, debounceMs, onChange }) ->
 *   { watch, unwatch, dispose }
 *   watchFn: fs.watch-compatible (path, opts, listener) => watcher  [injected for tests]
 *   onChange(absPath): fired once per debounce window
 */
function createFileWatcherRegistry({ watchFn, debounceMs, onChange }) {
  const entries = new Map(); // absPath -> { watcher, count, timer }

  function rearm(absPath, entry) {
    try { entry.watcher.close(); } catch {}
    try { entry.watcher = arm(absPath); } catch { /* file gone; next watch() recreates */ }
  }

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
    for (const p of [...entries.keys()]) {
      entries.get(p).count = 1;
      unwatch(p);
    }
  }

  return { watch, unwatch, dispose };
}

module.exports = { createFileWatcherRegistry };
