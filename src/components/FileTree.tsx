'use client';
import { useEffect, useRef, useState } from 'react';
import type { FsNode } from '@/types';
import { ChevronDown, ChevronRight } from 'lucide-react';

type Props = {
  nodes: FsNode[];
  activePath: string | null;
  onPickFile: (relativePath: string) => void;
  depth?: number;
  forceExpanded?: boolean;
  flashRelativePath?: string | null;
};

export function FileTree({ nodes, activePath, onPickFile, depth = 0, forceExpanded, flashRelativePath }: Props) {
  return (
    <ul className="text-sm">
      {nodes.map((node) =>
        node.type === 'dir' ? (
          <DirNode
            key={node.relativePath}
            node={node}
            activePath={activePath}
            onPickFile={onPickFile}
            depth={depth}
            forceExpanded={forceExpanded}
            flashRelativePath={flashRelativePath}
          />
        ) : (
          <FileItem
            key={node.relativePath}
            node={node}
            isActive={activePath === node.relativePath}
            onPickFile={onPickFile}
            depth={depth}
            flashRelativePath={flashRelativePath}
          />
        ),
      )}
    </ul>
  );
}

function DirNode({
  node,
  activePath,
  onPickFile,
  depth,
  forceExpanded,
  flashRelativePath,
}: {
  node: FsNode;
  activePath: string | null;
  onPickFile: (p: string) => void;
  depth: number;
  forceExpanded?: boolean;
  flashRelativePath?: string | null;
}) {
  // null = follow forceExpanded (e.g. a search auto-expands dirs); once the user
  // clicks, their explicit choice wins so folders stay collapsible while filtering.
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? !!forceExpanded;
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-fg hover:bg-surface-2"
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        <span className="w-3 text-xs" aria-hidden>
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
        <span>{node.name}</span>
      </button>
      {isOpen && node.children && (
        <FileTree
          nodes={node.children}
          activePath={activePath}
          onPickFile={onPickFile}
          depth={depth + 1}
          forceExpanded={forceExpanded}
          flashRelativePath={flashRelativePath}
        />
      )}
    </li>
  );
}

function FileItem({
  node,
  isActive,
  onPickFile,
  depth,
  flashRelativePath,
}: {
  node: FsNode;
  isActive: boolean;
  onPickFile: (p: string) => void;
  depth: number;
  flashRelativePath?: string | null;
}) {
  const isFlashing = !!flashRelativePath && node.relativePath === flashRelativePath;
  const liRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isFlashing) {
      const el = liRef.current;
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isFlashing]);

  return (
    <li ref={liRef} className={isFlashing ? 'bg-yellow-100 dark:bg-yellow-900/40 rounded transition-colors' : undefined}>
      <button
        type="button"
        onClick={() => onPickFile(node.relativePath)}
        className={[
          'flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left',
          isActive
            ? 'bg-accent-soft text-accent'
            : 'text-fg hover:bg-surface-2',
        ].join(' ')}
        style={{ paddingLeft: 4 + depth * 12 + 16 }}
      >
        <span>{node.name}</span>
      </button>
    </li>
  );
}
