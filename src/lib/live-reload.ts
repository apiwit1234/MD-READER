export type BufferState = 'none' | 'clean' | 'dirty';
export type ReloadAction = 'ignore' | 'refresh' | 'keep-edits';

/**
 * Decide what to do when fresh disk content arrives for the active file.
 * Own saves update the cache at save time, so their watcher echo compares
 * equal and lands on 'ignore' — no event attribution needed.
 */
export function reloadAction(
  diskContent: string,
  knownContent: string | undefined,
  buffer: BufferState,
): ReloadAction {
  if (diskContent === knownContent) return 'ignore';
  if (buffer === 'dirty') return 'keep-edits';
  return 'refresh';
}

/** True when absPath is root itself or inside it (Windows-style, case-insensitive). */
export function isUnderRoot(absPath: string, root: string): boolean {
  const norm = (p: string) => p.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
  const a = norm(absPath);
  const r = norm(root);
  return a === r || a.startsWith(r + '\\');
}
