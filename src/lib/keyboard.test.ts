import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installGlobalKeyboard, registerActiveHighlight } from './keyboard';

describe('keyboard router', () => {
  let openFind: ReturnType<typeof vi.fn>;
  let openSearch: ReturnType<typeof vi.fn>;
  let dispose: () => void;

  beforeEach(() => {
    openFind = vi.fn();
    openSearch = vi.fn();
    dispose = installGlobalKeyboard({ onOpenFind: openFind, onOpenGlobalSearch: openSearch });
  });

  afterEach(() => dispose());

  function fire(key: string, mods: { ctrl?: boolean; shift?: boolean } = {}) {
    const e = new KeyboardEvent('keydown', { key, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, bubbles: true, cancelable: true });
    window.dispatchEvent(e);
    return e;
  }

  it('Ctrl+F triggers onOpenFind and prevents default', () => {
    const e = fire('f', { ctrl: true });
    expect(openFind).toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);
  });

  it('Ctrl+Shift+F triggers onOpenGlobalSearch', () => {
    fire('F', { ctrl: true, shift: true });
    expect(openSearch).toHaveBeenCalled();
  });

  it('F3 routes to the registered highlight.next', () => {
    const next = vi.fn();
    const prev = vi.fn();
    const unregister = registerActiveHighlight({ next, prev });
    fire('F3');
    expect(next).toHaveBeenCalled();
    fire('F3', { shift: true });
    expect(prev).toHaveBeenCalled();
    unregister();
    next.mockClear();
    fire('F3');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('installGlobalKeyboard mode shortcuts', () => {
  it('invokes onSetMode for Ctrl+2', () => {
    const onSetMode = vi.fn();
    const off = installGlobalKeyboard({
      onOpenFind: () => {},
      onOpenGlobalSearch: () => {},
      onSetMode,
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', ctrlKey: true }));
    expect(onSetMode).toHaveBeenCalledWith('code');
    off();
  });
});
