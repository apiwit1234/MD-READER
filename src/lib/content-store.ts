/**
 * In-memory store of file buffers keyed by absolute path. Holds the on-disk
 * baseline (last read or saved) and the live buffer so we can report dirty state.
 * Framework-free; the page mirrors mutations into React state to trigger renders.
 */
export class ContentStore {
  private baseline = new Map<string, string>();
  private buffer = new Map<string, string>();

  /** Record content freshly read from disk (sets baseline + buffer). */
  seed(path: string, content: string): void {
    this.baseline.set(path, content);
    this.buffer.set(path, content);
  }

  /** Update the live buffer (from an editor edit). */
  set(path: string, content: string): void {
    this.buffer.set(path, content);
  }

  get(path: string): string | undefined {
    return this.buffer.get(path);
  }

  isDirty(path: string): boolean {
    if (!this.buffer.has(path)) return false;
    return this.buffer.get(path) !== this.baseline.get(path);
  }

  /** After a successful disk write: current buffer becomes the new baseline. */
  markSaved(path: string): void {
    const cur = this.buffer.get(path);
    if (cur !== undefined) this.baseline.set(path, cur);
  }

  dirtyPaths(): string[] {
    const out: string[] = [];
    for (const p of this.buffer.keys()) if (this.isDirty(p)) out.push(p);
    return out;
  }

  /** Every path currently holding a buffer. */
  paths(): string[] {
    return [...this.buffer.keys()];
  }

  /** Reseed with fresh disk content unless the buffer has unsaved edits. */
  replaceIfClean(path: string, content: string): boolean {
    if (this.isDirty(path)) return false;
    this.seed(path, content);
    return true;
  }

  /** Drop a clean buffer so the next open re-seeds from a fresh disk read. */
  dropIfClean(path: string): boolean {
    if (this.isDirty(path)) return false;
    this.baseline.delete(path);
    this.buffer.delete(path);
    return true;
  }
}
