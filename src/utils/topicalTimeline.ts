type MinimalAnchor = {
  year: number;
  type: 'state' | 'anchor';
};

type Era = { startYear: number; endYear: number };

export function getAnchorsForEra<T extends MinimalAnchor>(anchors: T[], era: Era): T[] {
  return anchors
    .filter(a =>
      a.type === 'anchor' &&
      a.year >= era.startYear &&
      a.year <= era.endYear
    )
    .sort((a, b) => a.year - b.year);
}

export function formatEraRange(era: Era, currentYear: number): string {
  const end = era.endYear >= currentYear ? 'Present' : String(era.endYear);
  return `${era.startYear}–${end}`;
}
