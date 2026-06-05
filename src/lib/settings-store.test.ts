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

const DEFAULT_SETTINGS = { autoUpdate: true, lastRunVersion: '' };

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
});

describe('createSettingsStore', () => {
  it('returns defaults when no file exists', () => {
    expect(createSettingsStore(dir).read()).toEqual(DEFAULT_SETTINGS);
  });

  it('write persists a patch and read round-trips it', () => {
    const store = createSettingsStore(dir);
    expect(store.write({ autoUpdate: false })).toEqual({ ...DEFAULT_SETTINGS, autoUpdate: false });
    expect(store.write({ lastRunVersion: '1.0.4' })).toEqual({ autoUpdate: false, lastRunVersion: '1.0.4' });
    expect(createSettingsStore(dir).read()).toEqual({ autoUpdate: false, lastRunVersion: '1.0.4' });
  });

  it('read survives a corrupted file', () => {
    const store = createSettingsStore(dir);
    writeFileSync(store.file, '{broken', 'utf-8');
    expect(store.read()).toEqual(DEFAULT_SETTINGS);
  });
});
