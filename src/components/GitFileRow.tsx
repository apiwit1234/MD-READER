'use client';
import type { GitFileStatus } from '@/types';

type Props = {
  file: GitFileStatus;
  staged: boolean;
  onOpenDiff: (file: GitFileStatus, staged: boolean) => void;
  onStage?: (file: GitFileStatus) => void;
  onUnstage?: (file: GitFileStatus) => void;
  onDiscard?: (file: GitFileStatus) => void;
};

function badge(file: GitFileStatus, staged: boolean): string {
  const c = staged ? file.index : (file.index === '?' ? '?' : file.workingTree);
  return c === ' ' ? '·' : c;
}

export function GitFileRow({ file, staged, onOpenDiff, onStage, onUnstage, onDiscard }: Props) {
  const name = file.path.split('/').pop() || file.path;
  return (
    <div className="group flex items-center gap-2 px-2 py-0.5 text-xs hover:bg-surface-2">
      <span className="w-3 text-center font-mono text-muted">{badge(file, staged)}</span>
      <button type="button" onClick={() => onOpenDiff(file, staged)} title={file.path}
        className="flex-1 truncate text-left text-fg">{name}</button>
      {onDiscard && <button type="button" aria-label="Discard" title="Discard changes"
        onClick={() => onDiscard(file)} className="opacity-0 group-hover:opacity-100">↺</button>}
      {onUnstage && <button type="button" aria-label="Unstage" title="Unstage"
        onClick={() => onUnstage(file)} className="opacity-0 group-hover:opacity-100">−</button>}
      {onStage && <button type="button" aria-label="Stage" title="Stage"
        onClick={() => onStage(file)} className="opacity-0 group-hover:opacity-100">+</button>}
    </div>
  );
}
