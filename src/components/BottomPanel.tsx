'use client';
import type { ReactNode } from 'react';
import type { BottomTabId } from '@/types';

type Props = {
  activeTab: BottomTabId;
  onActiveTabChange: (id: BottomTabId) => void;
  onCollapse: () => void;
  terminal: ReactNode;
  search: ReactNode;
  showHeader?: boolean;
};

export function BottomPanel({ activeTab, onActiveTabChange, onCollapse, terminal, search, showHeader = true }: Props) {
  return (
    <div className="flex h-full flex-col bg-bg" data-zoom-zone>
      {showHeader && (
        <div className="flex items-center border-b border-border bg-surface">
          <TabButton id="terminal" label="Terminal" active={activeTab === 'terminal'} onClick={onActiveTabChange} />
          <TabButton id="search" label="Search" active={activeTab === 'search'} onClick={onActiveTabChange} />
          <div className="ml-auto flex items-center pr-2">
            <button
              type="button"
              aria-label="Collapse bottom panel"
              onClick={onCollapse}
              className="rounded p-1 text-muted hover:bg-surface-2"
            >▢</button>
          </div>
        </div>
      )}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0" hidden={activeTab !== 'terminal'}>{terminal}</div>
        <div className="absolute inset-0" hidden={activeTab !== 'search'}>{search}</div>
      </div>
    </div>
  );
}

function TabButton({ id, label, active, onClick }: { id: BottomTabId; label: string; active: boolean; onClick: (id: BottomTabId) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={[
        'border-r border-border px-3 py-1 text-xs',
        active
          ? 'bg-bg font-medium text-fg'
          : 'text-muted hover:bg-surface-2',
      ].join(' ')}
    >{label}</button>
  );
}
