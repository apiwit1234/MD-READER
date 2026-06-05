import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// CommonJS module shared with the Electron main process (no electron imports inside).
import { createFontStore, fontIdFromFile } from '../../electron/fonts.cjs';

let dir: string;
let store: ReturnType<typeof createFontStore>;
let src: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mdreader-fonts-'));
  store = createFontStore(dir);
  src = join(dir, 'Sarabun.ttf');
  writeFileSync(src, Buffer.from('fake-font-bytes'));
  return () => rmSync(dir, { recursive: true, force: true });
});

describe('fontIdFromFile', () => {
  it('slugs to a css-safe id', () => {
    expect(fontIdFromFile('My Font (Bold).ttf')).toBe('custom-my-font-bold');
    expect(fontIdFromFile('Sarabun-Regular.woff2')).toBe('custom-sarabun-regular');
  });
});

describe('createFontStore', () => {
  it('addFromPath copies the file and lists it', () => {
    const r = store.addFromPath(src);
    expect(r.ok).toBe(true);
    expect(r.font).toEqual({ id: 'custom-sarabun', label: 'Sarabun' });
    expect(store.list()).toEqual([{ id: 'custom-sarabun', label: 'Sarabun' }]);
    expect(existsSync(join(dir, 'fonts', 'Sarabun.ttf'))).toBe(true);
  });

  it('rejects unsupported extensions', () => {
    const bad = join(dir, 'virus.exe');
    writeFileSync(bad, 'x');
    expect(store.addFromPath(bad).ok).toBe(false);
  });

  it('rejects duplicate ids', () => {
    store.addFromPath(src);
    expect(store.addFromPath(src).ok).toBe(false);
  });

  it('data returns bytes and format', () => {
    store.addFromPath(src);
    const r = store.data('custom-sarabun');
    expect(r.ok).toBe(true);
    expect(Buffer.from(r.bytes!).toString()).toBe('fake-font-bytes');
    expect(r.format).toBe('truetype');
  });

  it('remove deletes file and entry', () => {
    store.addFromPath(src);
    store.remove('custom-sarabun');
    expect(store.list()).toEqual([]);
    expect(existsSync(join(dir, 'fonts', 'Sarabun.ttf'))).toBe(false);
  });

  it('list prunes entries whose file disappeared', () => {
    store.addFromPath(src);
    unlinkSync(join(dir, 'fonts', 'Sarabun.ttf'));
    expect(store.list()).toEqual([]);
  });

  it('data for unknown id fails gracefully', () => {
    expect(store.data('custom-nope').ok).toBe(false);
  });
});
