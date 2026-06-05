/* Electron main process */
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, clipboard } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs').promises;
const http = require('node:http');
const { createReadStream, existsSync, statSync, appendFileSync, watch: fsWatch } = require('node:fs');
const { scanFiles } = require('./search-core.cjs');
const git = require('./git.cjs');
const { createSettingsStore } = require('./settings.cjs');
const { createErrorFileWriter } = require('./log-files.cjs');

// --- Error logging ---
// Everything goes to userData/logs: a running mdreader.log PLUS one file per
// error, so the user can open the folder and send the relevant files when
// reporting a bug.
function logsDirPath() {
  const dir = path.join(app.getPath('userData'), 'logs');
  try { require('node:fs').mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}
function logFilePath() {
  return path.join(logsDirPath(), 'mdreader.log');
}
let errorFileWriter = null;
function writeErrorFile(scope, message) {
  if (!errorFileWriter) errorFileWriter = createErrorFileWriter(logsDirPath());
  errorFileWriter(scope, message);
}
function appendLog(scope, message) {
  try {
    appendFileSync(logFilePath(), `[${new Date().toISOString()}] [${scope}] ${message}\n`);
  } catch {
    // logging must never throw
  }
  if (scope !== 'info') writeErrorFile(scope, message);
}
process.on('uncaughtException', (err) => appendLog('uncaughtException', (err && err.stack) || String(err)));
process.on('unhandledRejection', (reason) => appendLog('unhandledRejection', (reason && reason.stack) || String(reason)));

ipcMain.handle('app:logError', (_e, payload) => {
  const scope = payload && typeof payload.scope === 'string' ? payload.scope : 'renderer';
  const message = payload && typeof payload.message === 'string' ? payload.message : '';
  appendLog(scope, message);
  return logFilePath();
});
ipcMain.handle('app:logPath', () => logFilePath());

// Save a clipboard image to a temp PNG and return its path (for pasting images
// into the terminal, e.g. Claude Code). Returns null when the clipboard has no image.
ipcMain.handle('clipboard:saveImage', () => {
  try {
    const img = clipboard.readImage();
    if (!img || img.isEmpty()) return null;
    const file = path.join(os.tmpdir(), `mdreader-paste-${Date.now()}.png`);
    require('node:fs').writeFileSync(file, img.toPNG());
    return file;
  } catch (err) {
    appendLog('clipboard:saveImage', String((err && err.message) || err));
    return null;
  }
});
// Opens the logs FOLDER (running log + one file per error) so the user can
// pick files to send when reporting a bug.
ipcMain.handle('app:openLog', async () => {
  const dir = logsDirPath();
  if (!existsSync(logFilePath())) appendLog('info', 'log opened (no prior errors)');
  return shell.openPath(dir);
});

// --- App settings (userData/settings.json) ---
let settingsStore = null;
function getSettingsStore() {
  if (!settingsStore) settingsStore = createSettingsStore(app.getPath('userData'));
  return settingsStore;
}
ipcMain.handle('settings:get', () => getSettingsStore().read());
ipcMain.handle('settings:set', (_e, patch) =>
  getSettingsStore().write(patch && typeof patch === 'object' ? patch : {}),
);

// --- Auto-update (electron-updater + GitHub Releases) ---
let updaterRef = null;

function initAutoUpdate() {
  if (!app.isPackaged) return; // dev builds never check
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (err) {
    appendLog('autoUpdate', `electron-updater not loadable: ${(err && err.message) || err}`);
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // installs silently on next quit
  autoUpdater.on('update-downloaded', (info) => {
    for (const w of BrowserWindow.getAllWindows()) {
      try { w.webContents.send('app:update-ready', info.version); } catch {}
    }
  });
  autoUpdater.on('error', (err) => appendLog('autoUpdate', String((err && err.stack) || err)));
  updaterRef = autoUpdater;
  if (getSettingsStore().read().autoUpdate) {
    setTimeout(() => {
      updaterRef.checkForUpdates().catch((err) => appendLog('autoUpdate', String(err)));
    }, 10_000);
  }
}

// Restart immediately and apply a downloaded update (header pill click).
ipcMain.handle('update:install', () => {
  if (!updaterRef) return false;
  try {
    updaterRef.quitAndInstall();
    return true;
  } catch (err) {
    appendLog('autoUpdate', String((err && err.stack) || err));
    return false;
  }
});

// Tells the renderer (once per version change) that the app was just updated,
// so it can show an "updated to vX" confirmation after the silent install.
ipcMain.handle('app:versionInfo', () => {
  const store = getSettingsStore();
  const lastRun = store.read().lastRunVersion;
  const current = app.getVersion();
  if (lastRun !== current) store.write({ lastRunVersion: current });
  return { current, updatedFrom: lastRun && lastRun !== current ? lastRun : null };
});

ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return { ok: false, error: 'dev build — updates only work in the installed app' };
  if (!updaterRef) return { ok: false, error: 'updater unavailable' };
  try {
    const r = await updaterRef.checkForUpdates();
    const remote = r && r.updateInfo ? r.updateInfo.version : null;
    return { ok: true, version: remote !== app.getVersion() ? remote : null };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

const devUrl = process.env.ELECTRON_DEV_URL;

// Serve the Next.js static export on a FIXED port so the origin is stable across launches.
// A stable origin is required for localStorage to persist (resume on relaunch).
const PREFERRED_PORTS = [41280, 41281, 41282, 41283, 41284];

function startStaticServer(rootDir) {
  const resolvedRoot = path.resolve(rootDir) + path.sep;
  const handler = (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      let urlPath = decodeURIComponent(url.pathname);
      if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
      let filePath = path.resolve(path.join(rootDir, urlPath));
      if (!filePath.startsWith(resolvedRoot) && filePath + path.sep !== resolvedRoot) {
        res.statusCode = 403;
        res.end('forbidden');
        return;
      }
      if (!existsSync(filePath) && existsSync(filePath + '.html')) filePath += '.html';
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.map': 'application/json; charset=utf-8',
      }[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'no-store');
      createReadStream(filePath).pipe(res);
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  };

  return new Promise((resolve, reject) => {
    const tryPort = (i) => {
      if (i >= PREFERRED_PORTS.length) {
        reject(new Error('No preferred port available'));
        return;
      }
      const port = PREFERRED_PORTS[i];
      const server = http.createServer(handler);
      server.once('error', () => tryPort(i + 1));
      server.listen(port, '127.0.0.1', () => resolve({ server, port }));
    };
    tryPort(0);
  });
}

// Path safety: everything must stay under a single user-chosen root, configurable per session.
// In Electron we can read from anywhere the user explicitly picks; the safety is "did the user pick it".
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'target', '.next', '.nuxt']);

function sortChildren(children) {
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function buildTree(absRoot, relativeFromRoot = '') {
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
    const rel = relativeFromRoot ? `${relativeFromRoot}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const sub = await buildTree(absRoot, rel);
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

async function browseOneLevel(absDir) {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name))
    .map((e) => ({ name: e.name, type: 'dir' }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function breadcrumbsFor(absPath) {
  const parts = absPath.split(path.sep).filter(Boolean);
  const crumbs = [];
  let acc = '';
  const isAbsWindows = /^[A-Za-z]:/.test(absPath);
  for (const part of parts) {
    acc = acc ? path.join(acc, part) : (isAbsWindows ? part + path.sep : path.sep + part);
    crumbs.push({ name: part, path: acc });
  }
  return crumbs;
}

const cancellationFlags = new Map(); // sessionId -> true when cancelled

async function walkMarkdownFiles(absRoot) {
  const results = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        results.push(full);
      }
    }
  }
  await walk(absRoot);
  return results;
}

ipcMain.handle('fs:tree', async (_e, absPath) => buildTree(absPath));

ipcMain.handle('fs:browse', async (_e, absPath) => {
  const entries = await browseOneLevel(absPath);
  return { entries, breadcrumbs: breadcrumbsFor(absPath), currentPath: absPath };
});

ipcMain.handle('fs:read', async (_e, absPath) => {
  const content = await fs.readFile(absPath, 'utf-8');
  return { content, hostPath: absPath };
});

ipcMain.handle('fs:write', async (_e, { absPath, content, roots }) => {
  try {
    if (typeof absPath !== 'string' || typeof content !== 'string') {
      return { ok: false, error: 'bad arguments' };
    }
    const safeRoots = Array.isArray(roots) ? roots.filter((r) => typeof r === 'string') : [];
    // Canonicalize (collapses '..' and '.') before the containment check so a
    // crafted path cannot traverse out of an opened folder. Case-insensitive on win32.
    const canon = (p) => {
      const resolved = path.resolve(p);
      return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    };
    const t = canon(absPath);
    const allowed = safeRoots.some((r) => {
      const root = canon(r);
      return t === root || t.startsWith(root + path.sep);
    });
    if (!allowed) return { ok: false, error: 'path outside opened folders' };
    await fs.writeFile(absPath, content, 'utf-8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

ipcMain.handle('git:detect', (_e, folderPath) => git.detect(folderPath));
ipcMain.handle('git:status', (_e, root) => git.status(root));
ipcMain.handle('git:branches', (_e, root) => git.branches(root));
ipcMain.handle('git:diff', (_e, { root, path: p, staged }) => git.diff(root, p, !!staged));
ipcMain.handle('git:stage', (_e, { root, paths }) => git.stage(root, paths));
ipcMain.handle('git:unstage', (_e, { root, paths }) => git.unstage(root, paths));
ipcMain.handle('git:discard', (_e, { root, paths }) => git.discard(root, paths));
ipcMain.handle('git:commit', (_e, { root, message }) => git.commit(root, message));
ipcMain.handle('git:checkout', (_e, { root, branch }) => git.checkout(root, branch));
ipcMain.handle('git:createBranch', (_e, { root, name, from }) => git.createBranch(root, name, from));
ipcMain.handle('git:merge', (_e, { root, branch }) => git.merge(root, branch));
ipcMain.handle('git:fetch', (_e, root) => git.fetch(root));
ipcMain.handle('git:pull', (_e, root) => git.pull(root));
ipcMain.handle('git:push', (_e, root) => git.push(root));
ipcMain.handle('git:sync', (_e, root) => git.sync(root));

// --- Folder watching: notify renderer when files change under an opened folder. ---
// Ignore churny build/IDE/vcs paths so the watcher doesn't fire constantly.
// (buildTree already hides dotfiles, so changes to any '.'-prefixed segment are
// irrelevant to the visible tree and ignored too.)
const SKIP_WATCH = /(^|[\\/])(node_modules|\.git|\.next|\.nuxt|dist|build|out|target|bin|obj|\.vs|\.idea|\.vscode|coverage|\.cache|\.turbo|\.svn)([\\/]|$)/i;
const DOT_SEGMENT = /(^|[\\/])\.[^\\/]/;
const fsWatchers = new Map(); // absPath -> { watcher, count, timer }

function broadcastChanged(root) {
  for (const w of BrowserWindow.getAllWindows()) {
    try { w.webContents.send('fs:changed', root); } catch {}
  }
}

ipcMain.handle('fs:watch', (_e, absPath) => {
  if (typeof absPath !== 'string' || !absPath) return false;
  const existing = fsWatchers.get(absPath);
  if (existing) { existing.count++; return true; }
  let watcher;
  try {
    watcher = fsWatch(absPath, { recursive: true }, (_event, filename) => {
      if (filename) {
        const f = String(filename);
        if (SKIP_WATCH.test(f) || DOT_SEGMENT.test(f)) return;
      }
      const entry = fsWatchers.get(absPath);
      if (!entry) return;
      if (entry.timer) clearTimeout(entry.timer);
      entry.timer = setTimeout(() => broadcastChanged(absPath), 1200);
    });
  } catch (err) {
    appendLog('fs:watch', `${absPath}: ${(err && err.message) || err}`);
    return false;
  }
  watcher.on('error', (err) => appendLog('fs:watch', `${absPath}: ${(err && err.message) || err}`));
  fsWatchers.set(absPath, { watcher, count: 1, timer: null });
  return true;
});

ipcMain.handle('fs:unwatch', (_e, absPath) => {
  const entry = fsWatchers.get(absPath);
  if (!entry) return;
  entry.count--;
  if (entry.count <= 0) {
    try { entry.watcher.close(); } catch {}
    if (entry.timer) clearTimeout(entry.timer);
    fsWatchers.delete(absPath);
  }
});

ipcMain.handle('fs:pickDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Open folder',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('fs:homeDir', () => app.getPath('home'));

ipcMain.handle('fs:search', async (_e, opts) => {
  const t0 = Date.now();
  const query = typeof opts?.query === 'string' ? opts.query : '';
  const caseSensitive = !!opts?.caseSensitive;
  const scopes = Array.isArray(opts?.scopes) ? opts.scopes.filter((s) => typeof s === 'string') : [];
  let maxMatches = Number.isInteger(opts?.maxMatches) ? opts.maxMatches : 1000;
  if (maxMatches < 1) maxMatches = 1;
  if (maxMatches > 5000) maxMatches = 5000;
  const sessionId = typeof opts?.sessionId === 'string' ? opts.sessionId : '';

  if (!query || scopes.length === 0) {
    return { files: [], totalMatches: 0, truncated: false, cancelled: false, scannedFiles: 0, elapsedMs: Date.now() - t0 };
  }

  let allFiles = [];
  for (const scope of scopes) {
    try {
      const st = await fs.stat(scope);
      if (!st.isDirectory()) continue;
    } catch {
      continue;
    }
    const files = await walkMarkdownFiles(scope);
    allFiles = allFiles.concat(files);
  }

  const fileInputs = [];
  let scannedFiles = 0;
  for (const abs of allFiles) {
    if (sessionId && cancellationFlags.get(sessionId)) break;
    try {
      const content = await fs.readFile(abs, 'utf8');
      fileInputs.push({ hostPath: abs, content });
      scannedFiles++;
    } catch (err) {
      console.warn('fs:search: skip', abs, err && err.message);
    }
  }

  let result;
  if (sessionId && cancellationFlags.get(sessionId)) {
    result = { files: [], totalMatches: 0, truncated: false };
  } else {
    result = scanFiles({ files: fileInputs, query, caseSensitive, maxMatches });
  }

  const cancelled = sessionId ? !!cancellationFlags.get(sessionId) : false;
  if (sessionId) cancellationFlags.delete(sessionId);

  return {
    files: result.files,
    totalMatches: result.totalMatches,
    truncated: result.truncated,
    cancelled,
    scannedFiles,
    elapsedMs: Date.now() - t0,
  };
});

ipcMain.on('fs:search:cancel', (_e, sessionId) => {
  if (typeof sessionId === 'string' && sessionId.length > 0) {
    cancellationFlags.set(sessionId, true);
  }
});

// Spawn a new browser window, optionally seeded with an initial tab/folder.
ipcMain.handle('window:spawn', async (_e, opts) => {
  const windowId = nextSpawnedWindowId();
  // Place the new window near the cursor screen coords if provided.
  let x, y, width, height;
  if (opts && typeof opts.x === 'number' && typeof opts.y === 'number') {
    width = opts.width ?? 1200;
    height = opts.height ?? 800;
    x = Math.max(0, Math.round(opts.x - width / 2));
    y = Math.max(0, Math.round(opts.y - 30));
  }
  await createWindow({ windowId, x, y, width, height, initial: opts?.initial });
  return windowId;
});

// Terminal handlers
const ptys = new Map();
let nextPtyId = 1;

ipcMain.handle('term:spawn', async (event, opts) => {
  let pty;
  try {
    pty = require('node-pty');
  } catch (err) {
    return { ok: false, error: `node-pty not loadable: ${err.message}` };
  }
  const id = nextPtyId++;
  const isWindows = process.platform === 'win32';
  const shell = opts?.shell || (isWindows ? 'powershell.exe' : (process.env.SHELL || '/bin/bash'));
  const proc = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: opts?.cols || 80,
    rows: opts?.rows || 24,
    cwd: opts?.cwd || app.getPath('home'),
    env: { ...process.env, TERM: 'xterm-256color' },
  });
  ptys.set(id, proc);
  const sender = event.sender;
  proc.onData((data) => { if (!sender.isDestroyed()) sender.send(`term:data:${id}`, data); });
  proc.onExit(({ exitCode }) => {
    if (!sender.isDestroyed()) sender.send(`term:exit:${id}`, exitCode);
    ptys.delete(id);
  });
  return { ok: true, id };
});

ipcMain.handle('term:write', (_e, { id, data }) => {
  const p = ptys.get(id);
  if (p) p.write(data);
  return true;
});

ipcMain.handle('term:resize', (_e, { id, cols, rows }) => {
  const p = ptys.get(id);
  if (p) p.resize(cols, rows);
  return true;
});

ipcMain.handle('term:kill', (_e, { id }) => {
  const p = ptys.get(id);
  if (p) { try { p.kill(); } catch {} }
  ptys.delete(id);
  return true;
});

function windowStateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

async function readWindowState() {
  try {
    const raw = await fs.readFile(windowStateFile(), 'utf-8');
    const s = JSON.parse(raw);
    if (
      typeof s.width === 'number' && typeof s.height === 'number' &&
      typeof s.x === 'number' && typeof s.y === 'number'
    ) return s;
  } catch {}
  return null;
}

async function writeWindowState(state) {
  try {
    await fs.writeFile(windowStateFile(), JSON.stringify(state), 'utf-8');
  } catch {}
}

function nextSpawnedWindowId() {
  return 'w-' + Math.random().toString(36).slice(2, 10);
}

async function createWindow(opts = {}) {
  const { windowId = 'main', x, y, width, height, initial } = opts;
  const isMain = windowId === 'main';

  if (BrowserWindow.getAllWindows().length === 0) Menu.setApplicationMenu(null);

  // Only the "main" window restores last-session bounds.
  const restored = isMain ? await readWindowState() : null;

  const win = new BrowserWindow({
    width: width ?? restored?.width ?? 1400,
    height: height ?? restored?.height ?? 900,
    x: x ?? restored?.x,
    y: y ?? restored?.y,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
    title: 'MD Reader',
  });

  if (isMain && restored?.maximized) win.maximize();

  // Only the "main" window persists its bounds.
  if (isMain) {
    const saveBounds = () => {
      if (win.isDestroyed()) return;
      const b = win.getBounds();
      void writeWindowState({
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        maximized: win.isMaximized(),
      });
    };
    win.on('close', saveBounds);
    win.on('resize', saveBounds);
    win.on('move', saveBounds);
    win.on('maximize', saveBounds);
    win.on('unmaximize', saveBounds);
  }

  const qs = new URLSearchParams();
  qs.set('windowId', windowId);
  const query = qs.toString();

  if (devUrl) {
    win.loadURL(`${devUrl}?${query}`);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const rootDir = path.join(__dirname, '..', 'out');
    if (!staticServerPort) {
      const result = await startStaticServer(rootDir);
      staticServerPort = result.port;
    }
    win.loadURL(`http://127.0.0.1:${staticServerPort}/?${query}`);
  }

  // Deliver any pending startup file once the page is ready, and forward the
  // initial state (for spawned tear-off windows) via IPC.
  win.webContents.on('did-finish-load', () => {
    drainPendingFiles(win);
    if (initial && !win.isDestroyed()) {
      win.webContents.send('app:initial-state', initial);
    }
  });

  // Surface renderer load failures for diagnosis instead of leaving the user with a blank window.
  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    if (!win.isDestroyed()) {
      const escaped = String(errorDescription).replace(/</g, '&lt;');
      const html = `<html><body style="font-family:system-ui;padding:24px;color:#b91c1c"><h2>Failed to load window</h2><pre>${escaped}</pre><p style="color:#64748b">URL: ${validatedURL}</p></body></html>`;
      win.webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    }
  });

  return win;
}

// Files queued from CLI argv or second-instance events until a renderer is ready to receive them.
const pendingFiles = [];
let staticServerPort = null;
let mainWindow = null;

function extractFilePathsFromArgv(argv) {
  // Skip electron exe + entry point (first 1-2 args depending on dev/prod)
  const candidates = [];
  for (const arg of argv.slice(1)) {
    if (!arg || arg.startsWith('-')) continue;
    if (arg === '.' || arg === path.join(__dirname, '..')) continue;
    if (existsSync(arg)) candidates.push(path.resolve(arg));
  }
  return candidates;
}

function drainPendingFiles(win) {
  if (!win || pendingFiles.length === 0) return;
  for (const filePath of pendingFiles.splice(0)) {
    win.webContents.send('app:open-file', filePath);
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const files = extractFilePathsFromArgv(argv);
    pendingFiles.push(...files);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      drainPendingFiles(mainWindow);
    }
  });
}

app.whenReady().then(async () => {
  pendingFiles.push(...extractFilePathsFromArgv(process.argv));
  mainWindow = await createWindow();
  initAutoUpdate();
});

app.on('window-all-closed', () => {
  for (const pty of ptys.values()) { try { pty.kill(); } catch {} }
  ptys.clear();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
