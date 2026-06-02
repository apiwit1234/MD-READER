'use client';
import { useState } from 'react';

type Props = { stagedCount: number; busy: boolean; onCommit: (msg: string) => void; onCommitAndPush: (msg: string) => void };

export function CommitBox({ stagedCount, busy, onCommit, onCommitAndPush }: Props) {
  const [msg, setMsg] = useState('');
  const disabled = busy || stagedCount === 0 || msg.trim().length === 0;
  return (
    <div className="border-t border-border p-2">
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder={`Commit message (${stagedCount} staged)`}
        rows={2}
        className="w-full resize-none rounded border border-border bg-surface px-2 py-1 text-xs text-fg"
      />
      <div className="mt-1 flex gap-1">
        <button type="button" disabled={disabled} onClick={() => { onCommit(msg.trim()); setMsg(''); }}
          className="flex-1 rounded bg-accent px-2 py-1 text-xs text-accent-fg disabled:opacity-40">Commit</button>
        <button type="button" disabled={disabled} onClick={() => { onCommitAndPush(msg.trim()); setMsg(''); }}
          className="rounded border border-border px-2 py-1 text-xs text-fg disabled:opacity-40">+Push</button>
      </div>
    </div>
  );
}
