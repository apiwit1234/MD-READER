export type SideRowKind = 'context' | 'added' | 'removed' | 'modified';
export type SideRow = {
  leftNum: number | null;
  leftText: string | null;
  rightNum: number | null;
  rightText: string | null;
  kind: SideRowKind;
};

const HUNK_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Parse a unified diff (from `git diff`) into aligned side-by-side rows. */
export function diffToSides(unified: string): SideRow[] {
  if (!unified.trim()) return [];
  const lines = unified.split('\n');
  const rows: SideRow[] = [];
  let leftNum = 0;
  let rightNum = 0;
  let inHunk = false;

  // Buffers for consecutive removals/additions, flushed when a context line or EOF arrives.
  let dels: string[] = [];
  let adds: string[] = [];

  const flush = () => {
    const max = Math.max(dels.length, adds.length);
    for (let i = 0; i < max; i++) {
      const hasDel = i < dels.length;
      const hasAdd = i < adds.length;
      if (hasDel && hasAdd) {
        rows.push({ leftNum: ++leftNum, leftText: dels[i], rightNum: ++rightNum, rightText: adds[i], kind: 'modified' });
      } else if (hasDel) {
        rows.push({ leftNum: ++leftNum, leftText: dels[i], rightNum: null, rightText: null, kind: 'removed' });
      } else {
        rows.push({ leftNum: null, leftText: null, rightNum: ++rightNum, rightText: adds[i], kind: 'added' });
      }
    }
    dels = [];
    adds = [];
  };

  for (const line of lines) {
    const hunk = line.match(HUNK_RE);
    if (hunk) {
      flush();
      leftNum = parseInt(hunk[1], 10) - 1;
      rightNum = parseInt(hunk[2], 10) - 1;
      inHunk = true;
      continue;
    }
    if (!inHunk) continue; // skip diff/index/--- /+++ headers
    if (line.startsWith('\\')) continue; // "\ No newline at end of file"
    const tag = line[0];
    const text = line.slice(1);
    if (tag === '-') {
      dels.push(text);
    } else if (tag === '+') {
      adds.push(text);
    } else {
      // context (leading space) or empty line
      flush();
      rows.push({ leftNum: ++leftNum, leftText: text, rightNum: ++rightNum, rightText: text, kind: 'context' });
    }
  }
  flush();
  return rows;
}
