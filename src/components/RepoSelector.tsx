'use client';
import type { GitRepo } from '@/types';

type Props = { repos: GitRepo[]; activeRoot: string | null; onSelect: (root: string) => void };

export function RepoSelector({ repos, activeRoot, onSelect }: Props) {
  if (repos.length === 0) return <div className="px-2 py-1 text-xs text-muted">No git repository in opened folders.</div>;
  return (
    <select
      value={activeRoot ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-fg"
    >
      {repos.map((r) => (
        <option key={r.root} value={r.root}>{r.name}</option>
      ))}
    </select>
  );
}
