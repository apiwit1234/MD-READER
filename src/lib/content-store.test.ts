import { describe, it, expect } from 'vitest';
import { ContentStore } from './content-store';

describe('ContentStore', () => {
  it('seeds a baseline and is not dirty', () => {
    const s = new ContentStore();
    s.seed('/a.ts', 'hello');
    expect(s.get('/a.ts')).toBe('hello');
    expect(s.isDirty('/a.ts')).toBe(false);
    expect(s.dirtyPaths()).toEqual([]);
  });

  it('marks dirty when buffer differs from baseline', () => {
    const s = new ContentStore();
    s.seed('/a.ts', 'hello');
    s.set('/a.ts', 'hello world');
    expect(s.get('/a.ts')).toBe('hello world');
    expect(s.isDirty('/a.ts')).toBe(true);
    expect(s.dirtyPaths()).toEqual(['/a.ts']);
  });

  it('clears dirty when edited back to baseline', () => {
    const s = new ContentStore();
    s.seed('/a.ts', 'hello');
    s.set('/a.ts', 'changed');
    s.set('/a.ts', 'hello');
    expect(s.isDirty('/a.ts')).toBe(false);
  });

  it('markSaved adopts the current buffer as the new baseline', () => {
    const s = new ContentStore();
    s.seed('/a.ts', 'hello');
    s.set('/a.ts', 'hello world');
    s.markSaved('/a.ts');
    expect(s.isDirty('/a.ts')).toBe(false);
    expect(s.get('/a.ts')).toBe('hello world');
  });

  it('tracks multiple files independently', () => {
    const s = new ContentStore();
    s.seed('/a.ts', 'a');
    s.seed('/b.ts', 'b');
    s.set('/b.ts', 'bb');
    expect(s.isDirty('/a.ts')).toBe(false);
    expect(s.dirtyPaths()).toEqual(['/b.ts']);
  });

  it('returns undefined for unknown paths', () => {
    const s = new ContentStore();
    expect(s.get('/missing')).toBeUndefined();
  });
});

describe('live-reload additions', () => {
  it('paths lists every buffered path', () => {
    const s = new ContentStore();
    s.seed('C:\\a.md', 'one');
    s.seed('C:\\b.md', 'two');
    expect(s.paths().sort()).toEqual(['C:\\a.md', 'C:\\b.md']);
  });

  it('replaceIfClean reseeds clean and absent buffers', () => {
    const s = new ContentStore();
    expect(s.replaceIfClean('C:\\new.md', 'fresh')).toBe(true);
    expect(s.get('C:\\new.md')).toBe('fresh');

    s.seed('C:\\a.md', 'old');
    expect(s.replaceIfClean('C:\\a.md', 'fresh')).toBe(true);
    expect(s.get('C:\\a.md')).toBe('fresh');
    expect(s.isDirty('C:\\a.md')).toBe(false);
  });

  it('replaceIfClean leaves dirty buffers untouched', () => {
    const s = new ContentStore();
    s.seed('C:\\a.md', 'old');
    s.set('C:\\a.md', 'edited');
    expect(s.replaceIfClean('C:\\a.md', 'fresh')).toBe(false);
    expect(s.get('C:\\a.md')).toBe('edited');
    expect(s.isDirty('C:\\a.md')).toBe(true);
  });

  it('dropIfClean removes clean buffers and keeps dirty ones', () => {
    const s = new ContentStore();
    s.seed('C:\\clean.md', 'x');
    s.seed('C:\\dirty.md', 'x');
    s.set('C:\\dirty.md', 'y');
    expect(s.dropIfClean('C:\\clean.md')).toBe(true);
    expect(s.get('C:\\clean.md')).toBeUndefined();
    expect(s.dropIfClean('C:\\dirty.md')).toBe(false);
    expect(s.get('C:\\dirty.md')).toBe('y');
    expect(s.dropIfClean('C:\\absent.md')).toBe(true);
  });
});
