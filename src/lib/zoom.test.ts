import { describe, expect, test } from 'vitest';
import { applyZoomStep, ZOOM_MAX, ZOOM_MIN } from './zoom';

describe('applyZoomStep', () => {
  test('steps by 10', () => {
    expect(applyZoomStep(100, 1)).toBe(110);
    expect(applyZoomStep(100, -1)).toBe(90);
  });

  test('clamps at the bounds', () => {
    expect(applyZoomStep(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(applyZoomStep(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
    expect(applyZoomStep(195, 1)).toBe(200);
  });

  test('snaps off-grid values to the step grid', () => {
    expect(applyZoomStep(104, 1)).toBe(110);
    expect(applyZoomStep(104, -1)).toBe(90);
  });

  test('treats invalid input as 100', () => {
    expect(applyZoomStep(NaN, 1)).toBe(110);
  });
});
