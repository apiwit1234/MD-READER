import { describe, it, expect, vi } from 'vitest';
import { revealFile, subscribeReveal } from './sidebar-events';

describe('sidebar-events', () => {
  it('notifies subscribers', () => {
    const cb = vi.fn();
    const off = subscribeReveal(cb);
    revealFile('folder-1', 'docs/setup.md');
    expect(cb).toHaveBeenCalledWith({ folderId: 'folder-1', relativePath: 'docs/setup.md' });
    off();
  });

  it('stops calling after unsubscribe', () => {
    const cb = vi.fn();
    const off = subscribeReveal(cb);
    off();
    revealFile('folder-1', 'docs/setup.md');
    expect(cb).not.toHaveBeenCalled();
  });
});
