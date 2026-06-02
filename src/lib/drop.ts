import type { FsNode } from '@/types';

// FileSystemEntry is the experimental drag-drop entry API.
// Only available via DataTransferItem.webkitGetAsEntry() in browsers.
type FSEntry = {
  isDirectory: boolean;
  isFile: boolean;
  name: string;
  fullPath: string;
  createReader?: () => { readEntries: (cb: (entries: FSEntry[]) => void, err?: (e: Error) => void) => void };
  file?: (cb: (f: File) => void, err?: (e: Error) => void) => void;
};

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'target', '.next', '.nuxt']);

export type DropProgress = { filesScanned: number; mdFilesRead: number; lastPath: string };
export type DropResult = {
  tree: FsNode;
  contents: Record<string, string>; // key = relativePath, value = file content
  // The absolute host path of the dropped folder, if recoverable via Electron's webUtils.
  // When present, the caller should pin the folder as a REAL folder (no need to ship contents
  // since they can be re-read via fs.read).
  hostPath?: string;
};

type WalkContext = {
  contents: Record<string, string>;
  progress: DropProgress;
  onProgress?: (p: DropProgress) => void;
  hostPath?: string;
};

function getFile(entry: FSEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!entry.file) return reject(new Error(`Entry ${entry.name} has no file()`));
    entry.file(resolve, reject);
  });
}

function tryGetHostPathFromFile(file: File): string | null {
  if (typeof window === 'undefined') return null;
  const util = window.mdreader?.fileUtil;
  if (!util) return null;
  try {
    return util.pathForFile(file);
  } catch {
    return null;
  }
}

function isMarkdown(name: string): boolean {
  return name.toLowerCase().endsWith('.md');
}

function readEntriesAll(reader: NonNullable<FSEntry['createReader']>): Promise<FSEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FSEntry[] = [];
    const drain = () => {
      reader().readEntries((entries) => {
        if (entries.length === 0) resolve(all);
        else { all.push(...entries); drain(); }
      }, reject);
    };
    drain();
  });
}

function readFileText(entry: FSEntry): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!entry.file) return reject(new Error(`Entry ${entry.name} has no file()`));
    entry.file((f) => f.text().then(resolve, reject), reject);
  });
}

async function walkDir(entry: FSEntry, relativePath: string, ctx: WalkContext): Promise<FsNode> {
  const reader = entry.createReader!();
  const children: FsNode[] = [];
  const childEntries = await readEntriesAll(() => reader);
  for (const child of childEntries) {
    if (child.name.startsWith('.')) continue;
    if (child.isDirectory && SKIP_DIRS.has(child.name)) continue;
    const childRel = relativePath ? `${relativePath}/${child.name}` : child.name;
    if (child.isDirectory) {
      const sub = await walkDir(child, childRel, ctx);
      if (sub.children && sub.children.length > 0) children.push(sub);
    } else if (isMarkdown(child.name)) {
      try {
        const file = await getFile(child);
        // On the first file we encounter, try to recover the dropped folder's real host path.
        if (!ctx.hostPath) {
          const filePath = tryGetHostPathFromFile(file);
          if (filePath) {
            // filePath looks like "C:\Users\me\my-folder\docs\readme.md".
            // childRel is "docs/readme.md" (relative to drop root).
            // Strip the trailing relative tail to get the folder host path.
            const sep = filePath.includes('\\') ? '\\' : '/';
            const tail = sep + childRel.replace(/\//g, sep);
            if (filePath.endsWith(tail)) {
              ctx.hostPath = filePath.slice(0, filePath.length - tail.length);
            }
          }
        }
        const text = await file.text();
        ctx.contents[childRel] = text;
        children.push({ name: child.name, type: 'file', relativePath: childRel });
        ctx.progress.mdFilesRead++;
        ctx.progress.lastPath = childRel;
        ctx.onProgress?.({ ...ctx.progress });
      } catch {
        // skip unreadable
      }
    } else {
      // count as scanned but not read
      ctx.progress.filesScanned++;
      if (ctx.progress.filesScanned % 50 === 0) {
        ctx.progress.lastPath = childRel;
        ctx.onProgress?.({ ...ctx.progress });
      }
    }
  }
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { name: entry.name, type: 'dir', relativePath, children };
}

export async function processDroppedEntry(
  entry: FSEntry,
  onProgress?: (p: DropProgress) => void,
): Promise<DropResult> {
  const ctx: WalkContext = {
    contents: {},
    progress: { filesScanned: 0, mdFilesRead: 0, lastPath: '' },
    onProgress,
  };
  if (entry.isDirectory) {
    const tree = await walkDir(entry, '', ctx);
    return { tree, contents: ctx.contents, hostPath: ctx.hostPath };
  }
  // single file drop
  if (!isMarkdown(entry.name)) {
    return {
      tree: { name: 'Dropped files', type: 'dir', relativePath: '', children: [] },
      contents: {},
    };
  }
  const file = await getFile(entry);
  const filePath = tryGetHostPathFromFile(file);
  const text = await file.text();
  ctx.contents[entry.name] = text;
  // For a single-file drop we can also recover the parent dir.
  let hostPath: string | undefined;
  if (filePath) {
    const sep = filePath.includes('\\') ? '\\' : '/';
    const idx = filePath.lastIndexOf(sep);
    if (idx > 0) hostPath = filePath.slice(0, idx);
  }
  return {
    tree: {
      name: 'Dropped files',
      type: 'dir',
      relativePath: '',
      children: [{ name: entry.name, type: 'file', relativePath: entry.name }],
    },
    contents: ctx.contents,
    hostPath,
  };
}

// Bundle multiple file drops into a single virtual folder
export async function processDroppedFiles(
  entries: FSEntry[],
  onProgress?: (p: DropProgress) => void,
): Promise<DropResult> {
  const ctx: WalkContext = {
    contents: {},
    progress: { filesScanned: 0, mdFilesRead: 0, lastPath: '' },
    onProgress,
  };
  const children: FsNode[] = [];
  for (const e of entries) {
    if (!e.isFile) continue;
    if (!isMarkdown(e.name)) {
      ctx.progress.filesScanned++;
      continue;
    }
    try {
      const text = await readFileText(e);
      ctx.contents[e.name] = text;
      children.push({ name: e.name, type: 'file', relativePath: e.name });
      ctx.progress.mdFilesRead++;
      ctx.progress.lastPath = e.name;
      ctx.onProgress?.({ ...ctx.progress });
    } catch {
      // skip
    }
  }
  children.sort((a, b) => a.name.localeCompare(b.name));
  return {
    tree: { name: 'Dropped files', type: 'dir', relativePath: '', children },
    contents: ctx.contents,
  };
}

export function getDroppedEntries(dataTransfer: DataTransfer): FSEntry[] {
  const out: FSEntry[] = [];
  if (!dataTransfer.items) return out;
  for (let i = 0; i < dataTransfer.items.length; i++) {
    const item = dataTransfer.items[i];
    const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => FSEntry | null }).webkitGetAsEntry?.();
    if (entry) out.push(entry);
  }
  return out;
}
