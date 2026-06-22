import { describe, it, expect } from 'vitest';
import { computeLayerTops, hitTestLayer } from './layerMetrics';

describe('computeLayerTops', () => {
  it('returns empty array for empty input', () => {
    expect(computeLayerTops([])).toEqual([]);
  });

  it('first top is always 0', () => {
    expect(computeLayerTops([120])[0]).toBe(0);
    expect(computeLayerTops([90, 150])[0]).toBe(0);
  });

  it('accumulates heights correctly', () => {
    expect(computeLayerTops([100, 200, 150])).toEqual([0, 100, 300]);
  });

  it('single layer top is 0', () => {
    expect(computeLayerTops([200])).toEqual([0]);
  });
});

describe('hitTestLayer', () => {
  // Three layers: 0–99, 100–249, 250–369
  const tops    = [0, 100, 250];
  const heights = [100, 150, 120];

  it('returns -1 for negative y', () => {
    expect(hitTestLayer(-1, tops, heights)).toBe(-1);
  });
  it('returns -1 for empty layers', () => {
    expect(hitTestLayer(50, [], [])).toBe(-1);
  });
  it('identifies first layer at boundary', () => {
    expect(hitTestLayer(0, tops, heights)).toBe(0);
  });
  it('identifies first layer in middle', () => {
    expect(hitTestLayer(50, tops, heights)).toBe(0);
  });
  it('identifies first layer at last pixel', () => {
    expect(hitTestLayer(99, tops, heights)).toBe(0);
  });
  it('identifies second layer at boundary', () => {
    expect(hitTestLayer(100, tops, heights)).toBe(1);
  });
  it('identifies second layer in middle', () => {
    expect(hitTestLayer(200, tops, heights)).toBe(1);
  });
  it('identifies third layer', () => {
    expect(hitTestLayer(250, tops, heights)).toBe(2);
    expect(hitTestLayer(300, tops, heights)).toBe(2);
  });
  it('returns length for y at exact end of last layer', () => {
    expect(hitTestLayer(370, tops, heights)).toBe(3);
  });
  it('returns length for y beyond all layers', () => {
    expect(hitTestLayer(500, tops, heights)).toBe(3);
  });
});
