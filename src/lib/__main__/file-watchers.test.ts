import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

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

  it('dispose closes everything', () => {
    const { watchFn, closed } = makeFakeWatch();
    const reg = createFileWatcherRegistry({ watchFn, debounceMs: 150, onChange: vi.fn() });
    reg.watch('C:/a/one.md');
    reg.watch('C:/a/two.md');
    reg.dispose();
    expect(closed.sort()).toEqual(['C:/a/one.md', 'C:/a/two.md']);
  });
});
