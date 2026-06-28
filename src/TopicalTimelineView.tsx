import { forwardRef } from 'react';
import { getEventsForEra, formatEraRange } from './utils/topicalTimeline';
import type { TopicalEvent } from './utils/topicalTimeline';

type Column = {
  label: string;
  startYear: number;
  endYear: number;
  dateRange?: string;
  description?: string;
  color?: string;
};

export type TopicalTimelineViewProps = {
  title: string;
  subtitle?: string;
  eras: Column[];
  events: TopicalEvent[];
  printMode?: boolean;
  onAddEvent?: (era: Column) => void;
  onEditEvent?: (event: TopicalEvent, index: number) => void;
  onEditEra?: (era: Column) => void;
};

export const TopicalTimelineView = forwardRef<HTMLDivElement, TopicalTimelineViewProps>(
  ({ title, subtitle, eras, events, printMode = false, onAddEvent, onEditEvent, onEditEra }, ref) => {
    const currentYear = new Date().getFullYear();
    const sorted = [...eras].sort((a, b) => a.startYear - b.startYear);

    if (sorted.length === 0) return null;

    return (
      <div
        ref={ref}
        className={`u-topical-root${printMode ? ' u-topical-root--print' : ''}`}
        style={{ gridTemplateColumns: `repeat(${sorted.length}, 1fr)` }}
      >
        {/* Document header — omitted when both title and subtitle are empty */}
        {(title || subtitle) && (
          <div className="u-topical-header" style={{ gridColumn: `1 / ${sorted.length + 1}` }}>
            <h1 className="u-topical-title">{title}</h1>
            {subtitle && <p className="u-topical-subtitle">{subtitle}</p>}
          </div>
        )}

        {/* Era columns */}
        {sorted.map((era) => {
          const eraEvents = getEventsForEra(events, era);
          const eraColor = era.color ?? '#D2BDA3';

          return (
            <div
              key={`${era.startYear}-${era.label}`}
              className="u-topical-col"
              style={{ backgroundColor: `${eraColor}1f`, borderTopColor: eraColor }}
            >
              {/* Column header */}
              <div
                className={`u-topical-col-header${onEditEra && !printMode ? ' u-topical-col-header--editable' : ''}`}
                onClick={() => !printMode && onEditEra?.(era)}
              >
                <span className="u-topical-era-range" style={{ color: eraColor }}>
                  {formatEraRange(era, currentYear)}
                </span>
                <h2 className="u-topical-era-title">{era.label}</h2>
                {era.dateRange && (
                  <p className="u-topical-era-subtitle">{era.dateRange}</p>
                )}
              </div>

              {/* Event list */}
              <ul className="u-topical-event-list">
                {eraEvents.map((event, i) => {
                  return (
                    <li
                      key={`${i}-${event.year}`}
                      className={`u-topical-event${onEditEvent ? ' u-topical-event--editable' : ''}`}
                      onClick={() => onEditEvent?.(event, events.indexOf(event))}
                    >
                      <span className="u-topical-event-icon" style={{ color: eraColor }}>
                        {event.icon
                          ? <span className="material-symbols-outlined" style={{ fontSize: 18, color: eraColor, lineHeight: 1 }}>{event.icon}</span>
                          : <span className="u-topical-event-dot" style={{ background: eraColor }} />
                        }
                      </span>
                      <span className="u-topical-event-year">{event.year}</span>
                      <span className="u-topical-event-label">{event.label}</span>
                    </li>
                  );
                })}
              </ul>

              {/* Per-era add button (hidden in print mode) */}
              {!printMode && onAddEvent && (
                <button
                  className="u-topical-add-event"
                  onClick={() => onAddEvent(era)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>list_alt_add</span>
                  Add event to this era
                </button>
              )}

              {/* Footer */}
              {era.description && (
                <div className="u-topical-col-footer" style={{ borderTopColor: eraColor }}>
                  <span className="u-topical-shift-label">Main Institutional Shift</span>
                  <p className="u-topical-shift-text">{era.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

TopicalTimelineView.displayName = 'TopicalTimelineView';
