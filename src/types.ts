export type UnderstoryDocument = {
  title: string;
  subtitle?: string;
  startYear: number;
  endYear: number;
  eras: Era[];
  processDomains: ProcessDomain[];
  processes: HistoricalProcess[];
  anchors: AnchorEvent[];
  interactions: ProcessInteraction[];
  sources: SourceNote[];
  settings: DisplaySettings;
};

export type Era = {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  color?: string;
  description?: string;
};

export type ProcessDomain = {
  id: string;
  label: string;
  shortLabel?: string;
  color: string;
  icon?: string;
  order: number;
  description?: string;
};

export type HistoricalProcess = {
  id: string;
  domainId: string;
  label: string;
  startYear: number;
  endYear?: number;
  continues?: boolean;
  description?: string;
  importance?: 'primary' | 'secondary' | 'context';
};

export type AnchorEvent = {
  id: string;
  label: string;
  year: number;
  processId: string;
  domainId: string;
  importance: 'major' | 'supporting' | 'context';
  description?: string;
  sourceIds?: string[];
  confidence?: 'confirmed' | 'probable' | 'needs-verification';
  visibleLabel?: boolean;
};

export type ProcessInteraction = {
  id: string;
  fromId: string;
  toId: string;
  fromType: 'process' | 'anchor';
  toType: 'process' | 'anchor';
  year?: number;
  verb: string;
  description?: string;
  strength?: 'strong' | 'moderate' | 'contextual';
  sourceIds?: string[];
  confidence?: 'confirmed' | 'probable' | 'interpretive';
  visible?: boolean;
};

export type SourceNote = {
  id: string;
  label: string;
  citation?: string;
  url?: string;
  note?: string;
};

export type DisplaySettings = {
  activeView: 'process' | 'timeline' | 'influence';
  showEras: boolean;
  showMinorAnchors: boolean;
  showInteractionLabels: boolean;
  showOnlyMajorInteractions: boolean;
  exportTheme: 'light' | 'dark' | 'print';
};

export type SelectedItem =
  | { kind: 'process'; id: string }
  | { kind: 'anchor'; id: string }
  | { kind: 'interaction'; id: string }
  | { kind: 'domain'; id: string }
  | { kind: 'era'; id: string };
