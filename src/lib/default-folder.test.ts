import { describe, it, expect } from 'vitest';
import { shouldAutoOpenDefaultFolder } from './default-folder';

describe('shouldAutoOpenDefaultFolder', () => {
  it('false when no default folder is configured', () => {
    expect(shouldAutoOpenDefaultFolder(null, [])).toBe(false);
    expect(shouldAutoOpenDefaultFolder('', [])).toBe(false);
  });

  it('true when configured and not already open', () => {
    expect(shouldAutoOpenDefaultFolder('C:\\docs', [])).toBe(true);
    expect(shouldAutoOpenDefaultFolder('C:\\docs', [{ hostPath: 'C:\\other' }])).toBe(true);
  });

  it('false when the folder is already open', () => {
    expect(shouldAutoOpenDefaultFolder('C:\\docs', [{ hostPath: 'C:\\docs' }])).toBe(false);
  });
});
