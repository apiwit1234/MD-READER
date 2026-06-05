'use client';
import { useMemo } from 'react';
import { diffToSides, type SideRow } from '@/lib/diff-to-sides';

type Props = { unified: string; title: string };

export function DiffView({ unified, title }: Props) {
  const rows = useMemo(() => diffToSides(unified), [unified]);
  if (rows.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted">No changes in {title}.</div>;
  }
  return (
    <div className="h-full overflow-auto font-mono text-xs">
      <div className="sticky top-0 grid grid-cols-2 border-b border-border bg-surface text-[0.625rem] uppercase text-muted">
        <div className="px-2 py-1">Old</div>
        <div className="border-l border-border px-2 py-1">New</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2">
          <Cell num={r.leftNum} text={r.leftText} cls={leftClass(r.kind)} />
          <div className="border-l border-border">
            <Cell num={r.rightNum} text={r.rightText} cls={rightClass(r.kind)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function leftClass(kind: SideRow['kind']): string {
  return kind === 'removed' || kind === 'modified' ? 'bg-rose-500/10' : '';
}
function rightClass(kind: SideRow['kind']): string {
  return kind === 'added' || kind === 'modified' ? 'bg-emerald-500/10' : '';
}

function Cell({ num, text, cls }: { num: number | null; text: string | null; cls: string }) {
  return (
    <div className={['flex', cls].join(' ')}>
      <span className="w-10 shrink-0 select-none px-1 text-right text-muted">{num ?? ''}</span>
      <pre className="flex-1 whitespace-pre-wrap break-all px-2">{text ?? ''}</pre>
    </div>
  );
}
