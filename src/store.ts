import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import type { AppConfig, ButtonConfig, Corner, GridSize } from './types';
import { DEFAULT_CONFIG, GRID_SIZES } from './types';
import { setSfxSettings } from './audio/sfx';

const SAVE_DEBOUNCE_MS = 250;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingConfig: AppConfig | null = null;
let lastShortcutSignature: string | null = null;

function normalizeButtons(
  buttons: ButtonConfig[],
  pageSize: number
): ButtonConfig[] {
  const safePageSize = Math.max(1, pageSize);
  const pages = Math.max(1, Math.ceil(buttons.length / safePageSize));
  const targetCount = pages * safePageSize;
  return Array.from({ length: targetCount }, (_, i) => {
    if (i < buttons.length) return buttons[i];
    return { id: `btn-${i}`, label: '', icon: '', command: '' };
  });
}

function getShortcutSignature(config: AppConfig): string {
  const buttonCommands = config.buttons.map((b) => b.command.trim());
  return JSON.stringify({
    shortcutKey: config.shortcutKey,
    numpadShortcuts: config.numpadShortcuts,
    gridSize: config.gridSize,
    buttonCommands,
  });
}

async function persistConfig(config: AppConfig): Promise<void> {
  try {
    await invoke('save_config', { config });
    const nextSignature = getShortcutSignature(config);
    if (lastShortcutSignature !== nextSignature) {
      await emit('config-changed');
      lastShortcutSignature = nextSignature;
    }
  } catch (error) {
    console.warn('Failed to persist app config:', error);
  }
}

function queueConfigSave(config: AppConfig): void {
  pendingConfig = config;
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    const snapshot = pendingConfig;
    pendingConfig = null;
    saveTimer = null;
    if (snapshot) {
      void persistConfig(snapshot);
    }
  }, SAVE_DEBOUNCE_MS);
}

interface AppStore extends AppConfig {
  // UI state (not persisted)
  settingsOpen: boolean;
  editingButton: string | null;
  error: string | null;
  currentPage: number;

  // Actions
  setGridSize: (size: GridSize) => void;
  cycleGridSize: (direction: 1 | -1) => void;
  updateButton: (id: string, updates: Partial<ButtonConfig>) => void;
  setSettingsIconCorner: (corner: Corner) => void;
  setShortcutKey: (key: string) => void;
  setNumpadShortcuts: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setInactivityTimeout: (seconds: number) => void;
  setFadeOutDuration: (seconds: number) => void;
  addRecentCommand: (command: string) => void;
  clearRecentCommands: () => void;
  setSettingsOpen: (open: boolean) => void;
  setEditingButton: (id: string | null) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  addPage: () => void;
  executeButton: (button: ButtonConfig) => Promise<void>;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  resetDefaults: () => void;
}

export const useStore = create<AppStore>()((set, get) => ({
  ...DEFAULT_CONFIG,
  settingsOpen: false,
  editingButton: null,
  error: null,
  currentPage: 0,

  setGridSize: (size) => {
    const previous = get();
    const previousPageSize = previous.gridSize[0] * previous.gridSize[1];
    const [rows, cols] = size;
    const count = rows * cols;
    const pages = Math.max(1, Math.ceil(previous.buttons.length / previousPageSize));
    const targetCount = pages * count;
    const current = previous.buttons;
    const buttons = Array.from({ length: targetCount }, (_, i) => {
      if (i < current.length) return current[i];
      return { id: `btn-${i}`, label: '', icon: '', command: '' };
    });
    set({
      gridSize: size,
      buttons,
      currentPage: Math.min(previous.currentPage, Math.max(0, pages - 1)),
    });
    get().saveConfig();
  },

  cycleGridSize: (direction) => {
    const current = get().gridSize;
    const idx = GRID_SIZES.findIndex(
      ([r, c]) => r === current[0] && c === current[1]
    );
    if (direction > 0 && idx === GRID_SIZES.length - 1) {
      get().addPage();
      return;
    }
    const next = Math.min(
      GRID_SIZES.length - 1,
      Math.max(0, idx + direction)
    );
    get().setGridSize(GRID_SIZES[next]);
  },

  updateButton: (id, updates) => {
    set((s) => ({
      buttons: s.buttons.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
    get().saveConfig();
  },

  setSettingsIconCorner: (corner) => {
    set({ settingsIconCorner: corner });
    get().saveConfig();
  },

  setShortcutKey: (key) => {
    set({ shortcutKey: key });
    get().saveConfig();
  },

  setNumpadShortcuts: (enabled) => {
    set({ numpadShortcuts: enabled });
    get().saveConfig();
  },

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    setSfxSettings(enabled, get().soundVolume);
    get().saveConfig();
  },

  setSoundVolume: (volume) => {
    const clamped = Math.min(100, Math.max(0, volume));
    set({ soundVolume: clamped });
    setSfxSettings(get().soundEnabled, clamped);
    get().saveConfig();
  },

  setInactivityTimeout: (seconds) => {
    set({ inactivityTimeout: seconds });
    get().saveConfig();
  },

  setFadeOutDuration: (seconds) => {
    set({ fadeOutDuration: seconds });
    get().saveConfig();
  },

  addRecentCommand: (command) => {
    set((s) => ({
      recentCommands: [
        command,
        ...s.recentCommands.filter((c) => c !== command),
      ].slice(0, 5),
    }));
    get().saveConfig();
  },

  clearRecentCommands: () => {
    set({ recentCommands: [] });
    get().saveConfig();
  },

  setSettingsOpen: (open) => set({ settingsOpen: open, editingButton: null }),
  setEditingButton: (id) => set({ editingButton: id }),
  setError: (error) => set({ error }),
  setCurrentPage: (page) => {
    const { gridSize, buttons } = get();
    const pageSize = gridSize[0] * gridSize[1];
    const totalPages = Math.max(1, Math.ceil(buttons.length / pageSize));
    const next = Math.min(totalPages - 1, Math.max(0, page));
    set({ currentPage: next });
  },
  nextPage: () => {
    const { currentPage, setCurrentPage } = get();
    setCurrentPage(currentPage + 1);
  },
  prevPage: () => {
    const { currentPage, setCurrentPage } = get();
    setCurrentPage(currentPage - 1);
  },
  addPage: () => {
    const { gridSize, buttons, currentPage } = get();
    const pageSize = gridSize[0] * gridSize[1];
    const currentPages = Math.max(1, Math.ceil(buttons.length / pageSize));
    const targetCount = (currentPages + 1) * pageSize;
    const nextButtons = Array.from({ length: targetCount }, (_, i) => {
      if (i < buttons.length) return buttons[i];
      return { id: `btn-${i}`, label: '', icon: '', command: '' };
    });
    const nextPage = currentPages;
    set({ buttons: nextButtons, currentPage: Math.max(currentPage, nextPage) });
    get().saveConfig();
  },

  executeButton: async (button) => {
    const { setError, addRecentCommand } = get();
    const cmd = button.command.trim();
    if (!cmd) {
      setError('Empty command');
      return;
    }

    setError(null);

    try {
      const isUrl =
        cmd.startsWith('http://') || cmd.startsWith('https://');

      if (isUrl) {
        await invoke('open_url', { url: cmd });
        addRecentCommand(cmd);
      } else {
        const success = await invoke<boolean>('execute_command', { command: cmd });
        if (success) {
          addRecentCommand(cmd);
        }
      }
    } catch (err) {
      setError(String(err));
    }
  },

  loadConfig: async () => {
    try {
      const config = await invoke<AppConfig>('load_config');
      const resolvedConfig: AppConfig = {
        gridSize: config.gridSize ?? DEFAULT_CONFIG.gridSize,
        buttons: normalizeButtons(
          config.buttons ?? DEFAULT_CONFIG.buttons,
          (config.gridSize ?? DEFAULT_CONFIG.gridSize)[0] *
            (config.gridSize ?? DEFAULT_CONFIG.gridSize)[1]
        ),
        settingsIconCorner: config.settingsIconCorner ?? DEFAULT_CONFIG.settingsIconCorner,
        shortcutKey: config.shortcutKey ?? DEFAULT_CONFIG.shortcutKey,
        numpadShortcuts: config.numpadShortcuts ?? DEFAULT_CONFIG.numpadShortcuts,
        soundEnabled: config.soundEnabled ?? DEFAULT_CONFIG.soundEnabled,
        soundVolume: config.soundVolume ?? DEFAULT_CONFIG.soundVolume,
        inactivityTimeout: config.inactivityTimeout ?? DEFAULT_CONFIG.inactivityTimeout,
        fadeOutDuration: config.fadeOutDuration ?? DEFAULT_CONFIG.fadeOutDuration,
        recentCommands: config.recentCommands ?? DEFAULT_CONFIG.recentCommands,
      };
      set({
        ...resolvedConfig,
        currentPage: 0,
      });
      setSfxSettings(resolvedConfig.soundEnabled, resolvedConfig.soundVolume);
      lastShortcutSignature = getShortcutSignature(resolvedConfig);
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
    }
  },

  saveConfig: async () => {
    const s = get();
    const config: AppConfig = {
      gridSize: s.gridSize,
      buttons: s.buttons,
      settingsIconCorner: s.settingsIconCorner,
      shortcutKey: s.shortcutKey,
      numpadShortcuts: s.numpadShortcuts,
      soundEnabled: s.soundEnabled,
      soundVolume: s.soundVolume,
      inactivityTimeout: s.inactivityTimeout,
      fadeOutDuration: s.fadeOutDuration,
      recentCommands: s.recentCommands,
    };
    queueConfigSave(config);
  },

  resetDefaults: () => {
    set({
      ...DEFAULT_CONFIG,
      buttons: DEFAULT_CONFIG.buttons.map((b) => ({ ...b })),
    });
    setSfxSettings(DEFAULT_CONFIG.soundEnabled, DEFAULT_CONFIG.soundVolume);
    get().saveConfig();
  },
}));
