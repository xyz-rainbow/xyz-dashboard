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
  buttons: ButtonConfig[];
  settingsIconCorner: Corner;
  shortcutKey: string;
  numpadShortcuts: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  inactivityTimeout: number;
  fadeOutDuration: number;
  recentCommands: string[];
}

export const GRID_SIZES: GridSize[] = [
  [1, 1],
  [1, 2],
  [2, 2],
  [3, 3],
];

export const DEFAULT_CONFIG: AppConfig = {
  gridSize: [2, 2],
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
  inactivityTimeout: 30,
  fadeOutDuration: 4,
  recentCommands: [],
};
