export function computeLayerTops(heights: number[]): number[] {
  const tops: number[] = [];
  let acc = 0;
  for (const h of heights) {
    tops.push(acc);
    acc += h;
  }
  return tops;
}

export function hitTestLayer(
  y: number,
  tops: number[],
  heights: number[],
): number {
  if (y < 0 || tops.length === 0) return -1;
  for (let i = 0; i < tops.length; i++) {
    if (y < tops[i] + heights[i]) return i;
  }
  return tops.length;
}
