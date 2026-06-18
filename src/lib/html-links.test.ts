import { describe, it, expect } from 'vitest';
import { classifyLink } from './html-links';

describe('classifyLink', () => {
  it('treats http/https/mailto as external', () => {
    expect(classifyLink('https://x.com', 'docs/a.html')).toEqual({ kind: 'external', url: 'https://x.com' });
    expect(classifyLink('mailto:a@b.com', 'a.html')).toEqual({ kind: 'external', url: 'mailto:a@b.com' });
  });
  it('resolves relative .html links against the current file folder', () => {
    expect(classifyLink('b.html', 'docs/a.html')).toEqual({ kind: 'internal', relativePath: 'docs/b.html' });
    expect(classifyLink('../c.html', 'docs/sub/a.html')).toEqual({ kind: 'internal', relativePath: 'docs/c.html' });
    expect(classifyLink('./d.htm', 'a.html')).toEqual({ kind: 'internal', relativePath: 'd.htm' });
  });
  it('ignores pure anchors and non-html relative links', () => {
    expect(classifyLink('#section', 'a.html')).toEqual({ kind: 'ignore' });
    expect(classifyLink('style.css', 'a.html')).toEqual({ kind: 'ignore' });
    expect(classifyLink('', 'a.html')).toEqual({ kind: 'ignore' });
  });

  it('rejects path-traversal and absolute-path vectors', () => {
    expect(classifyLink('..\\..\\secret.html', 'docs/a.html')).toEqual({ kind: 'ignore' });
    expect(classifyLink('/etc/passwd.html', 'docs/a.html')).toEqual({ kind: 'ignore' });
    expect(classifyLink('foo\0.html', 'docs/a.html')).toEqual({ kind: 'ignore' });
  });
});
