export type Corner = 'tl' | 'tr' | 'bl' | 'br';
export type GridSize = [number, number];

export interface ButtonConfig {
  id: string;
  label: string;
  icon?: string;
  command: string;
}

export interface AppConfig {
  gridSize: GridSize;
  pageGridSizes: GridSize[];
  buttons: ButtonConfig[];
  settingsIconCorner: Corner;
  shortcutKey: string;
  numpadShortcuts: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  soundOutputChannel: 'stereo' | 'left' | 'right' | 'mono';
  soundTestSound: 'tap' | 'success' | 'error';
  inactivityTimeout: number;
  fadeOutDuration: number;
  recentCommands: string[];
  installedPacks: Record<string, { installedAt: string }>;
  lastIconPackSyncAt: string;
  iconUsageStats: Record<string, number>;
}

export const GRID_SIZES: GridSize[] = [
  [1, 1],
  [1, 2],
  [2, 2],
  [2, 3],
  [3, 3],
];

export const DEFAULT_CONFIG: AppConfig = {
  gridSize: [2, 2],
  pageGridSizes: [[2, 2]],
  buttons: Array.from({ length: 4 }, (_, i) => ({
    id: `btn-${i}`,
    label: '',
    icon: '',
    command: '',
  })),
  settingsIconCorner: 'br',
  shortcutKey: 'P',
  numpadShortcuts: true,
  soundEnabled: true,
  soundVolume: 65,
  soundOutputChannel: 'stereo',
  soundTestSound: 'tap',
  inactivityTimeout: 30,
  fadeOutDuration: 4,
  recentCommands: [],
  installedPacks: {},
  lastIconPackSyncAt: '',
  iconUsageStats: {},
};
