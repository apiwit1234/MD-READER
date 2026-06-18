/* Filesystem tree builder shared by fs:tree and fs:treeProgress.
   No electron imports so it stays unit-testable. */
const path = require('node:path');
const fs = require('node:fs/promises');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'target', '.next', '.nuxt']);

function sortChildren(children) {
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Count non-skipped files+dirs under a root (the denominator for progress). */
async function countEntries(absRoot) {
  let n = 0;
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
      n += 1;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name));
    }
  }
  await walk(absRoot);
  return n;
}

/** Build the nested tree. onScan() is invoked once per visited entry. */
async function buildTree(absRoot, relativeFromRoot = '', onScan) {
  const fullPath = relativeFromRoot ? path.join(absRoot, relativeFromRoot) : absRoot;
  let entries;
  try {
    entries = await fs.readdir(fullPath, { withFileTypes: true });
  } catch {
    return { name: path.basename(absRoot), type: 'dir', relativePath: relativeFromRoot, children: [] };
  }
  const children = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    if (onScan) onScan();
    const rel = relativeFromRoot ? `${relativeFromRoot}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const sub = await buildTree(absRoot, rel, onScan);
      if (sub.children && sub.children.length > 0) {
        children.push({ name: entry.name, type: 'dir', relativePath: rel, children: sub.children });
      }
    } else if (entry.isFile()) {
      children.push({ name: entry.name, type: 'file', relativePath: rel });
    }
  }
  sortChildren(children);
  return { name: path.basename(fullPath), type: 'dir', relativePath: relativeFromRoot, children };
}

module.exports = { buildTree, countEntries, sortChildren, SKIP_DIRS };
