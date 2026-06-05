'use client';
import { useEffect, useRef, useState } from 'react';
import { useAutoHideMenu } from '@/lib/useAutoHideMenu';

export type TabView = {
  folderId: string;
  relativePath: string;
  active: boolean;
  color: string;
  filename: string;
  pinned?: boolean;
  dirty?: boolean;
  /** File is being refreshed from an external disk change. */
  updating?: boolean;
};

type Props = {
  tabs: TabView[];
  onFocus: (tab: TabView) => void;
  onClose: (tab: TabView) => void;
  onCopyPath?: (tab: TabView) => void;
  onCopyFolderPath?: (tab: TabView) => void;
  onCloseOthers?: (tab: TabView) => void;
  onCloseAll?: () => void;
  onTogglePin?: (tab: TabView) => void;
  onTearOff?: (tab: TabView, screenX?: number, screenY?: number) => void;
  // When the user drags a tab and releases it over the terminal area.
  // Called with the tab's absolute path; consumer types it into the active terminal.
  onDropOnTerminal?: (tab: TabView) => void;
  /** Settings → Behavior: context menus close shortly after the mouse leaves. */
  menuAutoHide?: boolean;
};

const TEAR_OFF_THRESHOLD_PX = 24;

type ContextMenuState = { tab: TabView; x: number; y: number };

export function TabBar({
  tabs,
  onFocus,
  onClose,
  onCopyPath,
  onCopyFolderPath,
  onCloseOthers,
  onCloseAll,
  onTogglePin,
  onTearOff,
  onDropOnTerminal,
  menuAutoHide,
}: Props) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const menuHide = useAutoHideMenu(menuAutoHide ?? true, !!menu, () => setMenu(null));
  const listHide = useAutoHideMenu(menuAutoHide ?? true, listOpen, () => setListOpen(false));
  const [dragGhost, setDragGhost] = useState<{ tab: TabView; x: number; y: number; mode: 'inside' | 'outside' | 'terminal' } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLDivElement | null>(null);
  const dropdownWrapRef = useRef<HTMLDivElement | null>(null);

  function isOutsideWindow(screenX: number, screenY: number): boolean {
    if (typeof window === 'undefined') return false;
    const left = window.screenX;
    const top = window.screenY;
    const right = left + window.outerWidth;
    const bottom = top + window.outerHeight;
    const margin = TEAR_OFF_THRESHOLD_PX;
    return (
      screenX < left - margin ||
      screenX > right + margin ||
      screenY < top - margin ||
      screenY > bottom + margin
    );
  }

  function startTearDrag(e: React.MouseEvent, tab: TabView) {
    if (e.button !== 0) return; // left click only
    // Don't tear off via the inner ✕ button — that's a close.
    const target = e.target as HTMLElement | null;
    if (target && target.tagName === 'BUTTON') return;
    // Prevent the browser's default text selection while dragging.
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    let armed = false;
    let fired = false;
    let lastEvent: MouseEvent | null = null;

    const onMove = (ev: MouseEvent) => {
      lastEvent = ev;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!armed && Math.hypot(dx, dy) < TEAR_OFF_THRESHOLD_PX) return;
      armed = true;
      let mode: 'inside' | 'outside' | 'terminal' = 'inside';
      if (isOutsideWindow(ev.screenX, ev.screenY)) {
        mode = 'outside';
      } else if (onDropOnTerminal) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
        if (el?.closest('[data-drop-zone="terminal"]')) mode = 'terminal';
      }
      setDragGhost({ tab, x: ev.clientX, y: ev.clientY, mode });
    };
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setDragGhost(null);
      if (!armed || fired) return;
      const last = lastEvent ?? ev;

      // Priority 1: drop on terminal panel (or any element marked with data-drop-zone="terminal").
      if (onDropOnTerminal) {
        const el = document.elementFromPoint(last.clientX, last.clientY) as HTMLElement | null;
        const zone = el?.closest('[data-drop-zone="terminal"]');
        if (zone) {
          fired = true;
          onDropOnTerminal(tab);
          return;
        }
      }
      // Priority 2: outside the window → tear off into a new window.
      if (onTearOff && isOutsideWindow(last.screenX, last.screenY)) {
        fired = true;
        onTearOff(tab, last.screenX, last.screenY);
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', onEsc);
    };
  }, [menu]);

  // Scroll the active tab into view when activation changes.
  useEffect(() => {
    if (activeRef.current) activeRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tabs]);

  useEffect(() => {
    if (!listOpen) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownWrapRef.current && !dropdownWrapRef.current.contains(e.target as Node)) setListOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setListOpen(false); };
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onEsc);
    return () => { window.removeEventListener('click', onClick); window.removeEventListener('keydown', onEsc); };
  }, [listOpen]);

  if (tabs.length === 0) return null;

  function openMenu(e: React.MouseEvent, tab: TabView) {
    e.preventDefault();
    setMenu({ tab, x: e.clientX, y: e.clientY });
  }

  return (
    <>
      <div className="flex items-center border-b border-border bg-surface">
        <div
          ref={scrollRef}
          role="tablist"
          className="flex flex-1 overflow-x-auto whitespace-nowrap"
          style={{ scrollbarWidth: 'thin' }}
        >
          {tabs.map((t) => (
            <div
              key={`${t.folderId}::${t.relativePath}`}
              role="tab"
              aria-selected={t.active}
              ref={t.active ? activeRef : undefined}
              onClick={() => onFocus(t)}
              onContextMenu={(e) => openMenu(e, t)}
              onMouseDown={onTearOff ? (e) => startTearDrag(e, t) : undefined}
              title={t.relativePath}
              className={[
                'flex shrink-0 cursor-pointer select-none items-center gap-2 border-r border-border px-3 py-2 text-sm',
                t.pinned ? 'max-w-[160px]' : 'max-w-[220px]',
                t.active
                  ? 'border-b-2 border-b-accent bg-bg text-fg'
                  : 'text-muted hover:bg-surface-2',
              ].join(' ')}
            >
              <span className="h-3 w-[3px] shrink-0 rounded" style={{ background: t.color }} aria-hidden />
              {t.pinned && (
                <span aria-label="pinned" title="pinned" className="text-xs text-amber-500">📌</span>
              )}
              {t.dirty && (
                <span aria-label="unsaved" title="unsaved changes" className="text-amber-500">●</span>
              )}
              {t.updating && (
                <span aria-label="updating" title="updating from disk" className="inline-block animate-spin text-accent">↻</span>
              )}
              <span className="truncate">{t.filename}</span>
              {!t.pinned && (
                <button
                  type="button"
                  aria-label={`Close tab ${t.filename}`}
                  onClick={(e) => { e.stopPropagation(); onClose(t); }}
                  className="shrink-0 rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <div ref={dropdownWrapRef} className="relative shrink-0">
          <button
            type="button"
            title="Show all open tabs"
            aria-label="Show all tabs"
            aria-expanded={listOpen}
            onClick={(e) => { e.stopPropagation(); setListOpen((v) => !v); }}
            className="border-l border-border px-3 py-2 text-xs text-muted hover:bg-surface-2"
          >
            ▾ <span className="ml-1 font-mono">{tabs.length}</span>
          </button>
          {listOpen && (
            <div
              {...listHide}
              className="absolute right-0 top-full z-50 max-h-[min(420px,55vh)] w-[300px] overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
            >
              {tabs.map((t) => (
                <div
                  key={`${t.folderId}::${t.relativePath}`}
                  onClick={() => { onFocus(t); setListOpen(false); }}
                  title={t.relativePath}
                  className={[
                    'flex cursor-pointer items-center gap-2 px-3 py-1 text-xs',
                    t.active ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-2',
                  ].join(' ')}
                >
                  <span className="h-3 w-[3px] shrink-0 rounded" style={{ background: t.color }} aria-hidden />
                  {t.pinned && <span className="text-amber-500">📌</span>}
                  {t.dirty && <span className="text-amber-500">●</span>}
                  {t.updating && <span className="inline-block animate-spin text-accent">↻</span>}
                  <span className="flex-1 truncate">{t.filename}</span>
                  {!t.pinned && (
                    <button
                      type="button"
                      aria-label={`Close tab ${t.filename}`}
                      onClick={(e) => { e.stopPropagation(); onClose(t); }}
                      className="shrink-0 rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {dragGhost && (
        <div
          className={[
            'pointer-events-none fixed z-[100] rounded-md px-3 py-2 text-xs font-medium shadow-2xl',
            dragGhost.mode === 'outside'
              ? 'bg-accent text-accent-fg ring-2 ring-accent/40'
              : dragGhost.mode === 'terminal'
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
              : 'bg-fg/90 text-bg',
          ].join(' ')}
          style={{ left: dragGhost.x + 18, top: dragGhost.y + 22 }}
        >
          {dragGhost.mode === 'outside'
            ? '↗ Release to open in new window'
            : dragGhost.mode === 'terminal'
            ? '⌘ Drop to type path in terminal'
            : `↗ Drag — ${dragGhost.tab.filename}`}
        </div>
      )}

      {menu && (
        <div
          {...menuHide}
          className="fixed z-50 min-w-[180px] rounded-md border border-border bg-surface py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {onTogglePin && (
            <MenuItem onClick={() => { onTogglePin(menu.tab); setMenu(null); }}>
              {menu.tab.pinned ? '📌 Unpin tab' : '📌 Pin tab'}
            </MenuItem>
          )}
          {onTearOff && (
            <MenuItem onClick={() => { onTearOff(menu.tab); setMenu(null); }}>
              ↗ Move to new window
            </MenuItem>
          )}
          {onCopyPath && (
            <MenuItem onClick={() => { onCopyPath(menu.tab); setMenu(null); }}>
              📋 Copy file path
            </MenuItem>
          )}
          {onCopyFolderPath && (
            <MenuItem onClick={() => { onCopyFolderPath(menu.tab); setMenu(null); }}>
              📁 Copy folder path
            </MenuItem>
          )}
          {onCloseOthers && (
            <MenuItem onClick={() => { onCloseOthers(menu.tab); setMenu(null); }}>
              Close others
            </MenuItem>
          )}
          {onCloseAll && (
            <MenuItem onClick={() => { onCloseAll(); setMenu(null); }}>
              Close all tabs
            </MenuItem>
          )}
          {!menu.tab.pinned && (
            <MenuItem onClick={() => { onClose(menu.tab); setMenu(null); }}>
              Close
            </MenuItem>
          )}
        </div>
      )}
    </>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left text-xs text-fg hover:bg-surface-2"
    >
      {children}
    </button>
  );
}
