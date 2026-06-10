import { describe, expect, it } from 'vitest';
const { detectInstallKind, buildMigrationPlan } = require('../../../electron/migrate-nsis.cjs');

describe('detectInstallKind', () => {
  it('reports velopack when the exe runs from <root>/current with Update.exe beside it', () => {
    const exists = (p: string) => p.replace(/\\/g, '/').endsWith('/Update.exe');
    expect(
      detectInstallKind('C:\\Users\\u\\AppData\\Local\\PAXReader\\current\\PAX Reader.exe', exists),
    ).toBe('velopack');
  });

  it('reports nsis when the NSIS uninstaller exists in the exe dir', () => {
    const exists = (p: string) => p.replace(/\\/g, '/').endsWith('/Uninstall PAX Reader.exe');
    expect(
      detectInstallKind('C:\\Users\\u\\AppData\\Local\\Programs\\PAX Reader\\PAX Reader.exe', exists),
    ).toBe('nsis');
  });

  it('reports none for portable/dev (neither marker)', () => {
    expect(detectInstallKind('C:\\some\\dir\\PAX Reader.exe', () => false)).toBe('none');
  });
});

describe('buildMigrationPlan', () => {
  it('downloads setup, runs it silently, then uninstalls old silently', () => {
    const plan = buildMigrationPlan('C:\\Users\\u\\AppData\\Local\\Programs\\PAX Reader');
    expect(plan.setupUrl).toBe(
      'https://github.com/apiwit1234/MD-READER/releases/latest/download/PAXReader-win-Setup.exe',
    );
    expect(plan.setupArgs).toEqual(['--silent']);
    expect(plan.uninstallExe).toBe(
      'C:\\Users\\u\\AppData\\Local\\Programs\\PAX Reader\\Uninstall PAX Reader.exe',
    );
    expect(plan.uninstallArgs).toEqual(['/S']);
  });
});
