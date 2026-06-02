import { describe, it, expect } from 'vitest';
import { languageIdForPath } from './lang';

describe('languageIdForPath', () => {
  it('maps common extensions', () => {
    expect(languageIdForPath('a/b.ts')).toBe('javascript');
    expect(languageIdForPath('a/b.tsx')).toBe('javascript');
    expect(languageIdForPath('x.js')).toBe('javascript');
    expect(languageIdForPath('p.py')).toBe('python');
    expect(languageIdForPath('d.json')).toBe('json');
    expect(languageIdForPath('r.md')).toBe('markdown');
    expect(languageIdForPath('s.css')).toBe('css');
    expect(languageIdForPath('h.html')).toBe('html');
  });

  it('maps additional code languages', () => {
    expect(languageIdForPath('Service.cs')).toBe('csharp');
    expect(languageIdForPath('main.go')).toBe('go');
    expect(languageIdForPath('lib.rs')).toBe('rust');
    expect(languageIdForPath('config.yml')).toBe('yaml');
    expect(languageIdForPath('App.csproj')).toBe('xml');
    expect(languageIdForPath('run.sh')).toBe('shell');
  });

  it('detects files by name, not just extension', () => {
    expect(languageIdForPath('repo/Dockerfile')).toBe('dockerfile');
    expect(languageIdForPath('Makefile')).toBe('shell');
  });

  it('returns null for unknown or extensionless files', () => {
    expect(languageIdForPath('LICENSE')).toBeNull();
    expect(languageIdForPath('weird.xyz')).toBeNull();
  });

  it('is case-insensitive on the extension', () => {
    expect(languageIdForPath('A.TS')).toBe('javascript');
  });
});
