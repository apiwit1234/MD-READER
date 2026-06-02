import type { GitBranches } from '@/types';

/** Parse `git branch -a` output. */
export function parseBranches(raw: string): GitBranches {
  const local: string[] = [];
  const remote: string[] = [];
  let current: string | null = null;

  for (const lineRaw of raw.split('\n')) {
    const line = lineRaw.trimEnd();
    if (!line.trim()) continue;
    const isCurrent = line.startsWith('*');
    const name = line.replace(/^\*?\s+/, '').trim();
    if (name.includes('->')) continue;            // remotes/origin/HEAD -> origin/main
    if (name.startsWith('(HEAD detached')) continue;
    if (name.startsWith('remotes/')) {
      remote.push(name.slice('remotes/'.length));
      continue;
    }
    local.push(name);
    if (isCurrent) current = name;
  }

  return { current, local, remote };
}
