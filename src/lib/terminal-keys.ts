type KeyLike = {
  type: string;
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

/** Plain Ctrl+C keydown (no other modifiers) — the copy-or-SIGINT shortcut. */
export function isPlainCtrlC(e: KeyLike): boolean {
  return (
    e.type === 'keydown' &&
    e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey &&
    (e.key === 'c' || e.key === 'C')
  );
}
