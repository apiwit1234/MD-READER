/* Persistent app settings stored as JSON in userData. Read by the MAIN process
   (before any renderer exists), which is why this is not localStorage.
   No electron imports here so it stays unit-testable. */
const path = require('node:path');
const fsSync = require('node:fs');

const DEFAULTS = {
  autoUpdate: true,
  lastRunVersion: '',
  uiSize: 'medium',            // 'small' | 'medium' | 'large' — chrome scale
  contentZoom: 100,            // 50..200, snapped to 10s — reading content zoom
  contextMenuAutoHide: true,
  fontSource: 'default',       // reading font when fontSplit is off
  fontSplit: false,            // separate TH / EN reading fonts
  fontEnglish: 'default',
  fontThai: 'default',
  windowBackground: '',        // '#rrggbb' of last theme surface — title bar + launch bg
};

const UI_SIZES = ['small', 'medium', 'large'];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function clampZoom(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return DEFAULTS.contentZoom;
  return Math.min(200, Math.max(50, Math.round(x / 10) * 10));
}

function normalizeSettings(x) {
  const out = { ...DEFAULTS };
  if (x && typeof x === 'object') {
    if (typeof x.autoUpdate === 'boolean') out.autoUpdate = x.autoUpdate;
    if (typeof x.lastRunVersion === 'string') out.lastRunVersion = x.lastRunVersion;
    if (UI_SIZES.includes(x.uiSize)) out.uiSize = x.uiSize;
    if (x.contentZoom !== undefined) out.contentZoom = clampZoom(x.contentZoom);
    if (typeof x.contextMenuAutoHide === 'boolean') out.contextMenuAutoHide = x.contextMenuAutoHide;
    if (typeof x.fontSource === 'string' && x.fontSource) out.fontSource = x.fontSource;
    if (typeof x.fontSplit === 'boolean') out.fontSplit = x.fontSplit;
    if (typeof x.fontEnglish === 'string' && x.fontEnglish) out.fontEnglish = x.fontEnglish;
    if (typeof x.fontThai === 'string' && x.fontThai) out.fontThai = x.fontThai;
    if (typeof x.windowBackground === 'string' && HEX_COLOR.test(x.windowBackground)) out.windowBackground = x.windowBackground;
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

  // Factory reset (Settings → Advanced). lastRunVersion survives so the
  // "updated to vX" toast logic isn't re-triggered by a reset.
  function reset() {
    const next = { ...DEFAULTS, lastRunVersion: read().lastRunVersion };
    fsSync.writeFileSync(file, JSON.stringify(next, null, 2), 'utf-8');
    return next;
  }

  return { read, write, reset, file };
}

module.exports = { createSettingsStore, normalizeSettings, DEFAULTS };
