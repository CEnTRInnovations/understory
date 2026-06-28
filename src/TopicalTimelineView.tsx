import React, { forwardRef } from 'react';
import {
  Buildings, BookOpen, Users, Star, MapPin, ChartBar, Heart, GraduationCap,
  Handshake, Megaphone, Globe, Newspaper, Certificate, Tree, Scales, Lightbulb,
  Briefcase, FileText, PencilLine, Network, ArrowsCounterClockwise, Toolbox,
  PresentationChart, ClipboardText, Medal, Link, House, Microphone, Compass,
  Calendar, Flask, ChalkboardTeacher, CurrencyDollar, ArrowRight, Flag, Sparkle,
} from '@phosphor-icons/react';
import { getAnchorsForEra, formatEraRange } from './utils/topicalTimeline';

type TimelineEvent = {
  label: string;
  year: number;
  type: 'state' | 'anchor';
  icon?: string;
};

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
  anchors: TimelineEvent[];
  printMode?: boolean;
};

type IconComponent = React.ComponentType<{ size?: string | number; color?: string }>;

export const ICON_PALETTE: Array<{ name: string; Component: IconComponent }> = [
  { name: 'Buildings',               Component: Buildings },
  { name: 'BookOpen',                Component: BookOpen },
  { name: 'Users',                   Component: Users },
  { name: 'Star',                    Component: Star },
  { name: 'MapPin',                  Component: MapPin },
  { name: 'ChartBar',                Component: ChartBar },
  { name: 'Heart',                   Component: Heart },
  { name: 'GraduationCap',           Component: GraduationCap },
  { name: 'Handshake',               Component: Handshake },
  { name: 'Megaphone',               Component: Megaphone },
  { name: 'Globe',                   Component: Globe },
  { name: 'Newspaper',               Component: Newspaper },
  { name: 'Certificate',             Component: Certificate },
  { name: 'Tree',                    Component: Tree },
  { name: 'Scales',                  Component: Scales },
  { name: 'Lightbulb',               Component: Lightbulb },
  { name: 'Briefcase',               Component: Briefcase },
  { name: 'FileText',                Component: FileText },
  { name: 'PencilLine',              Component: PencilLine },
  { name: 'Network',                 Component: Network },
  { name: 'ArrowsCounterClockwise',  Component: ArrowsCounterClockwise },
  { name: 'Toolbox',                 Component: Toolbox },
  { name: 'PresentationChart',       Component: PresentationChart },
  { name: 'ClipboardText',           Component: ClipboardText },
  { name: 'Medal',                   Component: Medal },
  { name: 'Link',                    Component: Link },
  { name: 'House',                   Component: House },
  { name: 'Microphone',              Component: Microphone },
  { name: 'Compass',                 Component: Compass },
  { name: 'Calendar',                Component: Calendar },
  { name: 'Flask',                   Component: Flask },
  { name: 'ChalkboardTeacher',       Component: ChalkboardTeacher },
  { name: 'CurrencyDollar',          Component: CurrencyDollar },
  { name: 'ArrowRight',              Component: ArrowRight },
  { name: 'Flag',                    Component: Flag },
  { name: 'Sparkle',                 Component: Sparkle },
];



export const TopicalTimelineView = forwardRef<HTMLDivElement, TopicalTimelineViewProps>(
  ({ title, subtitle, eras, anchors, printMode = false }, ref) => {
    const currentYear = new Date().getFullYear();
    const sorted = [...eras].sort((a, b) => a.startYear - b.startYear);

    return (
      <div
        ref={ref}
        className={`u-topical-root${printMode ? ' u-topical-root--print' : ''}`}
        style={{ gridTemplateColumns: `repeat(${sorted.length}, 1fr)` }}
      >
        {/* Document header */}
        <div className="u-topical-header" style={{ gridColumn: `1 / ${sorted.length + 1}` }}>
          <h1 className="u-topical-title">{title}</h1>
          {subtitle && <p className="u-topical-subtitle">{subtitle}</p>}
        </div>

        {/* Era columns */}
        {sorted.map((era) => {
          const eraAnchors = getAnchorsForEra(anchors, era);
          const eraColor = era.color ?? '#D2BDA3';

          return (
            <div
              key={`${era.startYear}-${era.label}`}
              className="u-topical-col"
              style={{ backgroundColor: `${eraColor}1f`, borderTopColor: eraColor }}
            >
              {/* Column header */}
              <div className="u-topical-col-header">
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
                {eraAnchors.map((anchor) => {
                  const IconComponent = ICON_PALETTE.find(p => p.name === anchor.icon)?.Component ?? null;
                  return (
                    <li key={`${anchor.year}-${anchor.label}`} className="u-topical-event">
                      <span className="u-topical-event-icon" style={{ color: eraColor }}>
                        {IconComponent
                          ? <IconComponent size={18} color={eraColor} />
                          : <span className="u-topical-event-dot" style={{ background: eraColor }} />
                        }
                      </span>
                      <span className="u-topical-event-year">{anchor.year}</span>
                      <span className="u-topical-event-label">{anchor.label}</span>
                    </li>
                  );
                })}
              </ul>

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
