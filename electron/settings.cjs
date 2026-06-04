/* Persistent app settings stored as JSON in userData. Read by the MAIN process
   (before any renderer exists), which is why this is not localStorage.
   No electron imports here so it stays unit-testable. */
const path = require('node:path');
const fsSync = require('node:fs');

const DEFAULTS = { autoUpdate: true };

function normalizeSettings(x) {
  const out = { ...DEFAULTS };
  if (x && typeof x === 'object') {
    if (typeof x.autoUpdate === 'boolean') out.autoUpdate = x.autoUpdate;
  }
  return out;
}

function createSettingsStore(dir) {
  const file = path.join(dir, 'settings.json');

  function read() {
    try {
      return normalizeSettings(JSON.parse(fsSync.readFileSync(file, 'utf-8')));
    } catch {
      return { ...DEFAULTS };
    }
  }

  function write(patch) {
    const next = normalizeSettings({ ...read(), ...patch });
    fsSync.writeFileSync(file, JSON.stringify(next, null, 2), 'utf-8');
    return next;
  }

  return { read, write, file };
}

module.exports = { createSettingsStore, normalizeSettings, DEFAULTS };
