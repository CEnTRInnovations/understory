export type IconEntry = { name: string; category: string };

export const ICON_CATEGORIES = [
  'Time & place',
  'People & partnership',
  'Communication & networks',
  'Learning & knowledge',
  'Documents & records',
  'Institutions, policy & impact',
] as const;

export const ICON_PALETTE: IconEntry[] = [
  // Time & place
  { name: 'calendar_month',  category: 'Time & place' },
  { name: 'schedule',        category: 'Time & place' },
  { name: 'flag',            category: 'Time & place' },
  { name: 'location_on',     category: 'Time & place' },
  { name: 'signpost',        category: 'Time & place' },
  { name: 'explore',         category: 'Time & place' },
  { name: 'route',           category: 'Time & place' },
  { name: 'map',             category: 'Time & place' },
  // People & partnership
  { name: 'diversity_3',        category: 'People & partnership' },
  { name: 'groups',             category: 'People & partnership' },
  { name: 'person',             category: 'People & partnership' },
  { name: 'handshake',          category: 'People & partnership' },
  { name: 'partner_exchange',   category: 'People & partnership' },
  { name: 'volunteer_activism', category: 'People & partnership' },
  { name: 'home_work',          category: 'People & partnership' },
  { name: 'public',             category: 'People & partnership' },
  // Communication & networks
  { name: 'forum',                   category: 'Communication & networks' },
  { name: 'campaign',                category: 'Communication & networks' },
  { name: 'record_voice_over',       category: 'Communication & networks' },
  { name: 'hub',                     category: 'Communication & networks' },
  { name: 'share',                   category: 'Communication & networks' },
  { name: 'travel_explore',          category: 'Communication & networks' },
  { name: 'podium',                  category: 'Communication & networks' },
  { name: 'connect_without_contact', category: 'Communication & networks' },
  // Learning & knowledge
  { name: 'school',            category: 'Learning & knowledge' },
  { name: 'menu_book',         category: 'Learning & knowledge' },
  { name: 'history_edu',       category: 'Learning & knowledge' },
  { name: 'psychology',        category: 'Learning & knowledge' },
  { name: 'lightbulb',         category: 'Learning & knowledge' },
  { name: 'search',            category: 'Learning & knowledge' },
  { name: 'fact_check',        category: 'Learning & knowledge' },
  { name: 'workspace_premium', category: 'Learning & knowledge' },
  // Documents & records
  { name: 'description',   category: 'Documents & records' },
  { name: 'article',       category: 'Documents & records' },
  { name: 'newspaper',     category: 'Documents & records' },
  { name: 'folder_open',   category: 'Documents & records' },
  { name: 'archive',       category: 'Documents & records' },
  { name: 'clinical_notes',category: 'Documents & records' },
  { name: 'assignment',    category: 'Documents & records' },
  { name: 'edit_note',     category: 'Documents & records' },
  // Institutions, policy & impact
  { name: 'account_balance', category: 'Institutions, policy & impact' },
  { name: 'policy',          category: 'Institutions, policy & impact' },
  { name: 'gavel',           category: 'Institutions, policy & impact' },
  { name: 'balance',         category: 'Institutions, policy & impact' },
  { name: 'verified',        category: 'Institutions, policy & impact' },
  { name: 'task_alt',        category: 'Institutions, policy & impact' },
  { name: 'warning',         category: 'Institutions, policy & impact' },
  { name: 'trending_up',     category: 'Institutions, policy & impact' },
];
