export type Corner = 'tl' | 'tr' | 'bl' | 'br';
export type GridSize = [number, number];
export type ThemePreset = 'lime' | 'cyber' | 'aurora' | 'darkmoon' | 'multicolor';
export type AppLanguage = 'en' | 'es' | 'ca' | 'ja' | 'zh';

export interface ButtonConfig {
  id: string;
  label: string;
  icon?: string;
  command: string;
}

export interface AppConfig {
  language: AppLanguage;
  gridSize: GridSize;
  pageGridSizes: GridSize[];
  /** Active macro page index (0-based). Persisted with gridSize for the same page. */
  currentPage: number;
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
  /** 100 = default window size; up to 400 = 4× base (400×400 logical). */
  windowScalePercent: number;
  themePreset: ThemePreset;
  multicolorThemes: Exclude<ThemePreset, 'multicolor'>[];
}

export const GRID_SIZES: GridSize[] = [
  [1, 1],
  [1, 2],
  [2, 2],
  [2, 3],
  [3, 3],
];

export const DEFAULT_CONFIG: AppConfig = {
  language: 'en',
  gridSize: [2, 2],
  pageGridSizes: [[2, 2]],
  currentPage: 0,
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
  windowScalePercent: 100,
  themePreset: 'darkmoon',
  multicolorThemes: ['lime', 'cyber', 'aurora', 'darkmoon'],
};
