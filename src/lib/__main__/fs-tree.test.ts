import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// CommonJS module shared with the Electron main process (no electron imports inside).
import { buildTree, countEntries } from '../../../electron/fs-tree.cjs';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mdreader-tree-'));
  mkdirSync(join(dir, 'sub'));
  writeFileSync(join(dir, 'a.md'), '# a');
  writeFileSync(join(dir, 'sub', 'b.md'), '# b');
  mkdirSync(join(dir, 'node_modules'));
  writeFileSync(join(dir, 'node_modules', 'skip.md'), 'x');
  return () => rmSync(dir, { recursive: true, force: true });
});

describe('countEntries', () => {
  it('counts non-skipped files and dirs', async () => {
    // a.md, sub/, sub/b.md = 3 (node_modules skipped)
    expect(await countEntries(dir)).toBe(3);
  });
});

describe('buildTree', () => {
  it('invokes onScan once per visited entry and builds the tree', async () => {
    let scans = 0;
    const tree = await buildTree(dir, '', () => { scans += 1; });
    expect(scans).toBe(3);
    expect(tree.children?.map((c: { name: string }) => c.name).sort()).toEqual(['a.md', 'sub']);
  });
});
