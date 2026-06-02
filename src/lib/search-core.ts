export type ScanFileInput = { hostPath: string; content: string };

export type ScanMatch = {
  line: number;
  column: number;
  lineText: string;
};

export type ScanFileResult = {
  hostPath: string;
  matches: ScanMatch[];
};

export type ScanOpts = {
  files: ScanFileInput[];
  query: string;
  caseSensitive: boolean;
  maxMatches: number;
};

export type ScanResult = {
  files: ScanFileResult[];
  totalMatches: number;
  truncated: boolean;
};

const SNIPPET_MAX = 200;

function buildSnippet(line: string, matchStart: number, matchLen: number): string {
  const chars = Array.from(line);
  const beforeChars = Array.from(line.slice(0, matchStart));
  const matchChars = Array.from(line.slice(matchStart, matchStart + matchLen));
  const start = beforeChars.length;
  const end = start + matchChars.length;

  if (chars.length <= SNIPPET_MAX) {
    return chars.join('');
  }

  const padding = Math.floor((SNIPPET_MAX - (end - start)) / 2);
  let from = Math.max(0, start - padding);
  let to = Math.min(chars.length, from + SNIPPET_MAX);
  if (to - from < SNIPPET_MAX) {
    from = Math.max(0, to - SNIPPET_MAX);
  }
  const left = from > 0 ? '…' : '';
  const right = to < chars.length ? '…' : '';
  return left + chars.slice(from, to).join('') + right;
}

export function scanFiles(opts: ScanOpts): ScanResult {
  const { files, query, caseSensitive, maxMatches } = opts;
  const out: ScanFileResult[] = [];
  let totalMatches = 0;
  let truncated = false;

  if (!query) {
    return { files: out, totalMatches: 0, truncated: false };
  }

  const needle = caseSensitive ? query : query.toLowerCase();

  const sortedFiles = [...files].sort((a, b) => a.hostPath.localeCompare(b.hostPath));

  outer: for (const file of sortedFiles) {
    if (totalMatches >= maxMatches) { truncated = true; break; }
    const lines = file.content.split('\n');
    const fileMatches: ScanMatch[] = [];
    for (let i = 0; i < lines.length; i++) {
      const original = lines[i];
      const hay = caseSensitive ? original : original.toLowerCase();
      let from = 0;
      while (from <= hay.length) {
        const idx = hay.indexOf(needle, from);
        if (idx < 0) break;
        if (totalMatches >= maxMatches) { truncated = true; break outer; }
        fileMatches.push({
          line: i + 1,
          column: idx,
          lineText: buildSnippet(original, idx, query.length),
        });
        totalMatches++;
        from = idx + Math.max(1, needle.length);
      }
    }
    if (fileMatches.length > 0) out.push({ hostPath: file.hostPath, matches: fileMatches });
  }

  return { files: out, totalMatches, truncated };
}
