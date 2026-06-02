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
