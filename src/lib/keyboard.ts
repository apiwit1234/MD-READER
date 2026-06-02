type HighlightHandlers = {
  next: () => void;
  prev: () => void;
};

let activeHighlight: HighlightHandlers | null = null;

export function registerActiveHighlight(h: HighlightHandlers): () => void {
  activeHighlight = h;
  return () => {
    if (activeHighlight === h) activeHighlight = null;
  };
}

import { modeForKeydown, type Mode } from './mode';

export type GlobalKeyboardCallbacks = {
  onOpenFind: () => void;
  onOpenGlobalSearch: () => void;
  onSetMode?: (mode: Mode) => void;
  /** Current work mode. Ctrl+F is only handled here in 'md' mode; in 'code' mode
   *  CodeMirror's native search must handle it, so we don't intercept. */
  getMode?: () => Mode;
};

export function installGlobalKeyboard(cb: GlobalKeyboardCallbacks): () => void {
  function handler(e: KeyboardEvent) {
    const key = e.key;
    const isCtrl = e.ctrlKey || e.metaKey;

    const maybeMode = modeForKeydown(e);
    if (maybeMode && cb.onSetMode) {
      e.preventDefault();
      cb.onSetMode(maybeMode);
      return;
    }
    if (isCtrl && (key === 'f' || key === 'F') && !e.shiftKey) {
      // In Code mode, let CodeMirror's own search panel handle Ctrl+F.
      if (cb.getMode && cb.getMode() !== 'md') return;
      e.preventDefault();
      cb.onOpenFind();
      return;
    }
    if (isCtrl && (key === 'f' || key === 'F') && e.shiftKey) {
      e.preventDefault();
      cb.onOpenGlobalSearch();
      return;
    }
    if (key === 'F3') {
      e.preventDefault();
      if (!activeHighlight) return;
      if (e.shiftKey) activeHighlight.prev();
      else activeHighlight.next();
    }
  }
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
