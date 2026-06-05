'use client';
import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { getApi, hasApi } from '@/lib/electron-api';
import type { Theme } from '@/types';
import { terminalThemes } from '@/lib/terminal-themes';
import { isPlainCtrlC } from '@/lib/terminal-keys';

type Props = {
  sessionId: string;
  theme: Theme;
  visible: boolean;
  onPtyReady?: (ptyId: number) => void;
  /** Called with the byte length whenever the PTY emits output — a "running" signal. */
  onActivity?: (bytes: number) => void;
  /** Called when the user types/pastes into the terminal (used to distinguish echo from process output). */
  onInput?: () => void;
  /** Terminal text size in px (content zoom). Defaults to 13. */
  fontSize?: number;
};

export function Terminal({ sessionId, theme, visible, onPtyReady, onActivity, onInput, fontSize }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<number | null>(null);
  const subscriptionRef = useRef<{ offData?: () => void; offExit?: () => void }>({});
  const onActivityRef = useRef(onActivity);
  const onInputRef = useRef(onInput);
  useEffect(() => { onActivityRef.current = onActivity; onInputRef.current = onInput; });
  // Read at init time without making fontSize an init dependency.
  const fontSizeRef = useRef(fontSize ?? 13);
  fontSizeRef.current = fontSize ?? 13;

  // One-time init per session — xterm and PTY survive theme/visibility toggles.
  useEffect(() => {
    if (!hostRef.current) return;
    let disposed = false;
    const term = new XTerm({
      fontFamily: 'Consolas, "Cascadia Code", ui-monospace, monospace',
      fontSize: fontSizeRef.current,
      cursorBlink: true,
      scrollback: 5000,
      theme: terminalThemes[theme],
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    try { fit.fit(); } catch {}
    xtermRef.current = term;
    fitRef.current = fit;

    const ARROW_SEQ: Record<string, string> = {
      ArrowUp: '\x1b[A', ArrowDown: '\x1b[B', ArrowRight: '\x1b[C', ArrowLeft: '\x1b[D',
    };

    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true;

      // Force CSI arrow sequences. xterm sends application-cursor (SS3, ESC O A)
      // arrows once a TUI enables DECCKM; some ConPTY/TUI combos (e.g. Claude Code
      // on Windows) don't act on those, breaking arrow navigation. CSI arrows work
      // for shells and TUIs alike.
      if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && ptyIdRef.current != null) {
        const seq = ARROW_SEQ[e.key];
        if (seq) { void getApi().term.write(ptyIdRef.current, seq); onInputRef.current?.(); return false; }
      }

      // Ctrl+Enter inserts a newline (LF) instead of submitting. Plain Enter
      // still sends CR (\r) to run the command; this lets you add a line inside
      // a TUI prompt (e.g. Claude Code) without submitting it.
      if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && e.key === 'Enter' && ptyIdRef.current != null) {
        void getApi().term.write(ptyIdRef.current, '\n');
        onInputRef.current?.();
        return false;
      }

      // Ctrl+C copies the selection when one exists (like VS Code / Windows
      // Terminal). With no selection it returns true so xterm sends \x03
      // (SIGINT) to the shell — interrupt behavior is unchanged.
      if (isPlainCtrlC(e)) {
        if (term.hasSelection()) {
          void navigator.clipboard.writeText(term.getSelection());
          term.clearSelection();
          return false;
        }
        return true;
      }

      // Ctrl+V pastes the clipboard exactly once. We preventDefault to stop the
      // browser's own paste event (which would double-paste), then paste manually:
      // an image in the clipboard is saved to a temp file and its path pasted (for
      // Claude Code etc.); otherwise the clipboard text is pasted (bracketed-paste
      // aware via term.paste).
      if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        void (async () => {
          try {
            if (hasApi()) {
              const imgPath = await getApi().clipboard.saveImage();
              if (imgPath) { term.paste(imgPath); return; }
            }
            const text = await navigator.clipboard.readText();
            if (text) term.paste(text);
          } catch {
            // clipboard unavailable — ignore
          }
        })();
        return false;
      }
      return true;
    });

    (async () => {
      const spawnRes = await getApi().term.spawn({ cols: term.cols, rows: term.rows });
      if (disposed) { term.dispose(); return; }
      if (!spawnRes.ok) {
        term.write(`\x1b[31mFailed to start terminal: ${spawnRes.error}\x1b[0m\r\n`);
        return;
      }
      const id = spawnRes.id;
      ptyIdRef.current = id;
      onPtyReady?.(id);

      subscriptionRef.current.offData = getApi().term.onData(id, (data) => { term.write(data); onActivityRef.current?.(data.length); });
      subscriptionRef.current.offExit = getApi().term.onExit(id, () => term.write('\r\n\x1b[33m[process exited]\x1b[0m\r\n'));
      term.onData((data) => { void getApi().term.write(id, data); onInputRef.current?.(); });
    })();

    return () => {
      disposed = true;
      subscriptionRef.current.offData?.();
      subscriptionRef.current.offExit?.();
      if (ptyIdRef.current != null) void getApi().term.kill(ptyIdRef.current);
      try { term.dispose(); } catch {}
      xtermRef.current = null;
      fitRef.current = null;
      ptyIdRef.current = null;
    };
    // sessionId intentionally in deps so unmount/remount on session change reinitializes;
    // theme/visible never trigger reinit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Imperative theme update — never reinit.
  useEffect(() => {
    if (xtermRef.current) xtermRef.current.options.theme = terminalThemes[theme];
  }, [theme]);

  // Live-resize terminal text when the content zoom changes — never reinit.
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;
    term.options.fontSize = fontSize ?? 13;
    try {
      fitRef.current?.fit();
      const id = ptyIdRef.current;
      if (id != null) void getApi().term.resize(id, term.cols, term.rows);
    } catch {}
  }, [fontSize]);

  // Refit when becoming visible (xterm doesn't size correctly while display:none).
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      try {
        fitRef.current?.fit();
        const term = xtermRef.current;
        const id = ptyIdRef.current;
        if (term && id != null) void getApi().term.resize(id, term.cols, term.rows);
        term?.focus();
      } catch {}
    }, 30);
    return () => clearTimeout(t);
  }, [visible]);

  // Window resize refit while visible.
  useEffect(() => {
    const onResize = () => {
      if (!visible) return;
      try {
        fitRef.current?.fit();
        const term = xtermRef.current;
        const id = ptyIdRef.current;
        if (term && id != null) void getApi().term.resize(id, term.cols, term.rows);
      } catch {}
    };
    window.addEventListener('resize', onResize);
    let resizeObserver: ResizeObserver | null = null;
    if (hostRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(hostRef.current);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
    };
  }, [visible]);

  return (
    <div
      ref={hostRef}
      className="h-full w-full overflow-hidden"
      style={{ display: visible ? 'block' : 'none' }}
    />
  );
}
