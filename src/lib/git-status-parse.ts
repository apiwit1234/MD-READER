import type { GitStatus, GitFileStatus } from '@/types';

const CONFLICT_CODES = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU']);

function parseBranchHeader(line: string): Pick<GitStatus, 'branch' | 'upstream' | 'ahead' | 'behind'> {
  // Strip the leading "## ".
  const body = line.slice(3);
  let ahead = 0;
  let behind = 0;
  const abMatch = body.match(/\[(.*)\]\s*$/);
  if (abMatch) {
    const a = abMatch[1].match(/ahead (\d+)/);
    const b = abMatch[1].match(/behind (\d+)/);
    if (a) ahead = parseInt(a[1], 10);
    if (b) behind = parseInt(b[1], 10);
  }
  const head = body.replace(/\s*\[.*\]\s*$/, '');
  // "No commits yet on main"
  const noCommits = head.match(/^No commits yet on (.+)$/);
  if (noCommits) return { branch: noCommits[1].trim(), upstream: null, ahead, behind };
  // "main...origin/main" or "main"
  const dots = head.indexOf('...');
  if (dots >= 0) {
    return { branch: head.slice(0, dots), upstream: head.slice(dots + 3), ahead, behind };
  }
  return { branch: head.trim() || null, upstream: null, ahead, behind };
}

export function parseStatus(raw: string): GitStatus {
  const records = raw.split('\0').filter((r) => r.length > 0);
  let header = { branch: null as string | null, upstream: null as string | null, ahead: 0, behind: 0 };
  const files: GitFileStatus[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (rec.startsWith('## ')) {
      header = parseBranchHeader(rec);
      continue;
    }
    const xy = rec.slice(0, 2);
    const index = xy[0];
    const workingTree = xy[1];
    const path = rec.slice(3); // skip "XY "
    let origPath: string | undefined;
    // Rename/copy entries (R/C in either slot) consume the next record as the original path.
    if (index === 'R' || index === 'C' || workingTree === 'R' || workingTree === 'C') {
      origPath = records[i + 1];
      i++;
    }
    files.push({
      path,
      index,
      workingTree,
      conflicted: CONFLICT_CODES.has(xy),
      ...(origPath !== undefined ? { origPath } : {}),
    });
  }

  return { ...header, files };
}
