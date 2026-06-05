/* Tests for the main-process settings store (pure CJS, no electron imports).
   Uses vitest globals (globals: true in vitest.config.ts) — `require('vitest')`
   is not allowed from CJS. */
const { mkdtempSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { normalizeSettings, createSettingsStore, DEFAULTS } = require('./settings.cjs');

describe('normalizeSettings', () => {
  test('returns defaults for garbage input', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULTS);
    expect(normalizeSettings('x')).toEqual(DEFAULTS);
    expect(normalizeSettings({})).toEqual(DEFAULTS);
  });

  test('accepts valid new keys', () => {
    const out = normalizeSettings({
      uiSize: 'large',
      contentZoom: 150,
      contextMenuAutoHide: false,
      fontSource: 'noto-sans-thai',
      fontSplit: true,
      fontEnglish: 'custom-inter',
      fontThai: 'noto-sans-thai',
      windowBackground: '#1E293B',
    });
    expect(out.uiSize).toBe('large');
    expect(out.contentZoom).toBe(150);
    expect(out.contextMenuAutoHide).toBe(false);
    expect(out.fontSource).toBe('noto-sans-thai');
    expect(out.fontSplit).toBe(true);
    expect(out.fontEnglish).toBe('custom-inter');
    expect(out.fontThai).toBe('noto-sans-thai');
    expect(out.windowBackground).toBe('#1E293B');
  });

  test('rejects invalid uiSize and windowBackground', () => {
    const out = normalizeSettings({ uiSize: 'huge', windowBackground: 'red' });
    expect(out.uiSize).toBe('medium');
    expect(out.windowBackground).toBe('');
  });

  test('clamps and snaps contentZoom', () => {
    expect(normalizeSettings({ contentZoom: 30 }).contentZoom).toBe(50);
    expect(normalizeSettings({ contentZoom: 999 }).contentZoom).toBe(200);
    expect(normalizeSettings({ contentZoom: 104 }).contentZoom).toBe(100);
    expect(normalizeSettings({ contentZoom: 'x' }).contentZoom).toBe(100);
  });
});

describe('createSettingsStore.reset', () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(path.join(os.tmpdir(), 'mdr-settings-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  test('reset restores defaults but keeps lastRunVersion', () => {
    const store = createSettingsStore(dir);
    store.write({ uiSize: 'large', contentZoom: 150, lastRunVersion: '1.0.4' });
    const out = store.reset();
    expect(out.uiSize).toBe('medium');
    expect(out.contentZoom).toBe(100);
    expect(out.lastRunVersion).toBe('1.0.4');
    expect(store.read()).toEqual(out);
  });
});
