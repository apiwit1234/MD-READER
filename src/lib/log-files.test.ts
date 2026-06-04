import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// CommonJS module shared with the Electron main process (no electron imports inside).
import { createErrorFileWriter, errorFileName, safeScope } from '../../electron/log-files.cjs';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mdreader-logs-'));
  return () => rmSync(dir, { recursive: true, force: true });
});

describe('safeScope', () => {
  it('keeps word characters and replaces the rest', () => {
    expect(safeScope('mermaid')).toBe('mermaid');
    expect(safeScope('a b/c:d')).toBe('a_b_c_d');
  });

  it('falls back to error for empty/missing scopes', () => {
    expect(safeScope('')).toBe('error');
    expect(safeScope(undefined)).toBe('error');
  });
});

describe('errorFileName', () => {
  it('builds a sortable, filesystem-safe name', () => {
    const name = errorFileName('renderer', new Date('2026-06-04T10:20:30.400Z'), 7);
    expect(name).toBe('error-2026-06-04T10-20-30-400Z-7-renderer.log');
  });
});

describe('createErrorFileWriter', () => {
  it('writes one file per error containing scope and message', () => {
    const write = createErrorFileWriter(dir);
    const f1 = write('mermaid', 'parse failed');
    const f2 = write('renderer', 'boom');
    expect(f1).not.toBe(f2);
    expect(readdirSync(dir)).toHaveLength(2);
    expect(readFileSync(f1!, 'utf-8')).toContain('[mermaid]');
    expect(readFileSync(f1!, 'utf-8')).toContain('parse failed');
  });

  it('creates the directory on demand', () => {
    const nested = join(dir, 'logs');
    const write = createErrorFileWriter(nested);
    expect(write('x', 'y')).not.toBeNull();
    expect(readdirSync(nested)).toHaveLength(1);
  });
});
