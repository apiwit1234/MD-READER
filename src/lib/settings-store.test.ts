import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// CommonJS module shared with the Electron main process (no electron imports inside).
import { createSettingsStore, normalizeSettings } from '../../electron/settings.cjs';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mdreader-settings-'));
  return () => rmSync(dir, { recursive: true, force: true });
});

const DEFAULT_SETTINGS = {
  autoUpdate: true,
  lastRunVersion: '',
  uiSize: 'medium',
  contentZoom: 100,
  contextMenuAutoHide: true,
  fontSource: 'default',
  fontSplit: false,
  fontEnglish: 'default',
  fontThai: 'default',
  windowBackground: '',
  showHtmlInMd: true,
};

describe('normalizeSettings', () => {
  it('fills defaults and drops unknown keys', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ autoUpdate: false, junk: 1 })).toEqual({ ...DEFAULT_SETTINGS, autoUpdate: false });
    expect(normalizeSettings({ autoUpdate: 'yes' })).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps lastRunVersion strings and rejects non-strings', () => {
    expect(normalizeSettings({ lastRunVersion: '1.0.3' })).toEqual({ ...DEFAULT_SETTINGS, lastRunVersion: '1.0.3' });
    expect(normalizeSettings({ lastRunVersion: 42 })).toEqual(DEFAULT_SETTINGS);
  });

  it('accepts valid v1.0.5 keys', () => {
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

  it('rejects invalid uiSize and windowBackground', () => {
    const out = normalizeSettings({ uiSize: 'huge', windowBackground: 'red' });
    expect(out.uiSize).toBe('medium');
    expect(out.windowBackground).toBe('');
  });

  it('clamps and snaps contentZoom', () => {
    expect(normalizeSettings({ contentZoom: 30 }).contentZoom).toBe(50);
    expect(normalizeSettings({ contentZoom: 999 }).contentZoom).toBe(200);
    expect(normalizeSettings({ contentZoom: 104 }).contentZoom).toBe(100);
    expect(normalizeSettings({ contentZoom: 'x' }).contentZoom).toBe(100);
  });
});

describe('createSettingsStore', () => {
  it('returns defaults when no file exists', () => {
    expect(createSettingsStore(dir).read()).toEqual(DEFAULT_SETTINGS);
  });

  it('write persists a patch and read round-trips it', () => {
    const store = createSettingsStore(dir);
    expect(store.write({ autoUpdate: false })).toEqual({ ...DEFAULT_SETTINGS, autoUpdate: false });
    expect(store.write({ lastRunVersion: '1.0.4' })).toEqual({ ...DEFAULT_SETTINGS, autoUpdate: false, lastRunVersion: '1.0.4' });
    expect(createSettingsStore(dir).read()).toEqual({ ...DEFAULT_SETTINGS, autoUpdate: false, lastRunVersion: '1.0.4' });
  });

  it('read survives a corrupted file', () => {
    const store = createSettingsStore(dir);
    writeFileSync(store.file, '{broken', 'utf-8');
    expect(store.read()).toEqual(DEFAULT_SETTINGS);
  });

  it('reset restores defaults but keeps lastRunVersion', () => {
    const store = createSettingsStore(dir);
    store.write({ uiSize: 'large', contentZoom: 150, lastRunVersion: '1.0.4' });
    const out = store.reset();
    expect(out.uiSize).toBe('medium');
    expect(out.contentZoom).toBe(100);
    expect(out.lastRunVersion).toBe('1.0.4');
    expect(store.read()).toEqual(out);
  });
});
