/* Custom reading fonts: files copied into <userData>/fonts with a fonts.json
   manifest. No electron imports so it stays unit-testable (same pattern as
   settings.cjs). */
const path = require('node:path');
const fsSync = require('node:fs');

const ALLOWED_EXTS = ['.ttf', '.otf', '.woff', '.woff2'];
const FORMAT_BY_EXT = { '.ttf': 'truetype', '.otf': 'opentype', '.woff': 'woff', '.woff2': 'woff2' };

/** Stable, css-safe font id derived from the file name. */
function fontIdFromFile(fileName) {
  const base = fileName.toLowerCase().replace(/\.[^.]+$/, '');
  return 'custom-' + base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function createFontStore(userDataDir) {
  const dir = path.join(userDataDir, 'fonts');
  const manifestFile = path.join(dir, 'fonts.json');

  function ensureDir() {
    fsSync.mkdirSync(dir, { recursive: true });
  }

  function readManifest() {
    try {
      const arr = JSON.parse(fsSync.readFileSync(manifestFile, 'utf-8'));
      if (!Array.isArray(arr)) return [];
      return arr.filter(
        (f) => f && typeof f.id === 'string' && typeof f.label === 'string' &&
               typeof f.file === 'string' && typeof f.format === 'string',
      );
    } catch {
      return [];
    }
  }

  function writeManifest(list) {
    ensureDir();
    fsSync.writeFileSync(manifestFile, JSON.stringify(list, null, 2), 'utf-8');
  }

  function list() {
    // Prune entries whose file the user deleted manually.
    const all = readManifest();
    const present = all.filter((f) => fsSync.existsSync(path.join(dir, f.file)));
    if (present.length !== all.length) writeManifest(present);
    return present.map(({ id, label }) => ({ id, label }));
  }

  function addFromPath(srcPath) {
    const ext = path.extname(srcPath).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return { ok: false, error: `Unsupported font type: ${ext || '(none)'} — use TTF, OTF, WOFF or WOFF2` };
    }
    const base = path.basename(srcPath);
    const id = fontIdFromFile(base);
    const all = readManifest();
    if (all.some((f) => f.id === id)) {
      return { ok: false, error: 'A font with this file name is already installed' };
    }
    ensureDir();
    try {
      fsSync.copyFileSync(srcPath, path.join(dir, base));
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) };
    }
    const font = { id, label: base.replace(/\.[^.]+$/, ''), file: base, format: FORMAT_BY_EXT[ext] };
    writeManifest([...all, font]);
    return { ok: true, font: { id: font.id, label: font.label } };
  }

  function remove(id) {
    const all = readManifest();
    const target = all.find((f) => f.id === id);
    if (target) {
      try { fsSync.unlinkSync(path.join(dir, target.file)); } catch {}
      writeManifest(all.filter((f) => f.id !== id));
    }
    return { ok: true };
  }

  function data(id) {
    const target = readManifest().find((f) => f.id === id);
    if (!target) return { ok: false, error: 'Font not found' };
    try {
      const bytes = fsSync.readFileSync(path.join(dir, target.file));
      return { ok: true, bytes, format: target.format };
    } catch {
      return { ok: false, error: 'Font file missing' };
    }
  }

  return { list, addFromPath, remove, data, dir };
}

module.exports = { createFontStore, fontIdFromFile, ALLOWED_EXTS };
