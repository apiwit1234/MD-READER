export type RevealEvent = { folderId: string; relativePath: string };
type Listener = (e: RevealEvent) => void;

const listeners = new Set<Listener>();

export function subscribeReveal(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function revealFile(folderId: string, relativePath: string): void {
  for (const fn of listeners) fn({ folderId, relativePath });
}
