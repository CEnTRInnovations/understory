export type TopicalEvent = {
  label: string;
  year: number;
  icon?: string;
  eraLabel?: string;
};

type Era = { label: string; startYear: number; endYear: number };

export function getEventsForEra(events: TopicalEvent[], era: Era): TopicalEvent[] {
  return events
    .filter(e => e.eraLabel !== undefined
      ? e.eraLabel === era.label
      : e.year >= era.startYear && e.year <= era.endYear)
    .sort((a, b) => a.year - b.year);
}

export function formatEraRange(era: Era, currentYear: number): string {
  const end = era.endYear >= currentYear ? 'Present' : String(era.endYear);
  return `${era.startYear}–${end}`;
}
