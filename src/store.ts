/**
 *  __   __  ________
 *  \ \ / / |___  __/
 *   \ V /      / /   
 *    > <      / /    
 *   / ^ \    / /___  
 *  /_/ \_\  /______/ 
 * 
 * XYZ Dashboard - Sistema de Gestión de Macro-Teclado
 * #xyz-rainbow #xyz-rainbowtechnology #rainbowtechnology.xyz
 */

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import i18n from './i18n';
import type { AppConfig, ButtonConfig, Corner, GridSize, ThemePreset, AppLanguage } from './types';
import type { BaseThemePreset } from './themePresets';
import { DEFAULT_CONFIG, GRID_SIZES } from './types';
import {
  playErrorSfx,
  playSuccessSfx,
  playTapSfx,
  setSfxOutputChannel,
  setSfxSettings,
} from './audio/sfx';

// Firmas ocultas en Base64
// I3h5ei1yYWluYm93ICN4eXotcmFpbmJvd3RlY2hub2xvZ3kgI3JhaW5ib3d0ZWNobm9sb2d5Lnh5eg==
const _SIGS = ['I3h5ei1yYWluYm93', 'I3h5ei1yYWluYm93dGVjaG5vbG9neQ==', 'I3JhaW5ib3d0ZWNobm9sb2d5Lnh5eg==', 'I3JhaW5ib3cueHl6', 'I3JhaW5ib3dAcmFpbmJvd3RlY2hub2xvZ3kueHl6', 'I2ktbG92ZS15b3U=', 'I1lvdSdyZSBub3Qgc3VwcG9zZWQgdG8gc2VlIHRoaXMh'];
void _SIGS.length;

const SAVE_DEBOUNCE_MS = 250;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingConfig: AppConfig | null = null;
let lastShortcutSignature: string | null = null;

/**
 * Normaliza la lista de botones para que coincida con el tamaño de la página
 */
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

function pageCapacity(size: GridSize): number {
  return Math.max(1, size[0] * size[1]);
}

function pageStart(pageSizes: GridSize[], pageIndex: number): number {
  let start = 0;
  for (let i = 0; i < pageIndex; i += 1) {
    start += pageCapacity(pageSizes[i]);
  }
  return start;
}

/**
 * Asegura que las dimensiones de la cuadrícula por página sean válidas
 */
function normalizePageGridSizes(
  pageGridSizes: GridSize[] | undefined,
  legacyGridSize: GridSize,
  buttonCount: number
): GridSize[] {
  const safe = (pageGridSizes && pageGridSizes.length > 0
    ? pageGridSizes
    : [legacyGridSize]
  ).map(([r, c]) => [Math.max(1, r), Math.max(1, c)] as GridSize);
  let capacity = safe.reduce((acc, s) => acc + pageCapacity(s), 0);
  while (capacity < buttonCount) {
    const fallback = safe[safe.length - 1] ?? legacyGridSize;
    safe.push(fallback);
    capacity += pageCapacity(fallback);
  }
  return safe;
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

/**
 * Persiste la configuración en el backend (Tauri)
 */
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

function clampPageIndex(page: number, pageCount: number): number {
  const n = Math.max(1, pageCount);
  return Math.min(n - 1, Math.max(0, Math.floor(page)));
}

function getConfigSnapshot(state: AppStore): AppConfig {
  const sizes = state.pageGridSizes;
  const page = clampPageIndex(state.currentPage, sizes.length);
  const gridSizeForPage = sizes[page] ?? state.gridSize;
  return {
    language: state.language,
    gridSize: gridSizeForPage,
    pageGridSizes: state.pageGridSizes,
    currentPage: page,
    buttons: state.buttons,
    settingsIconCorner: state.settingsIconCorner,
    shortcutKey: state.shortcutKey,
    numpadShortcuts: state.numpadShortcuts,
    soundEnabled: state.soundEnabled,
    soundVolume: state.soundVolume,
    soundOutputChannel: state.soundOutputChannel,
    soundTestSound: state.soundTestSound,
    inactivityTimeout: state.inactivityTimeout,
    fadeOutDuration: state.fadeOutDuration,
    recentCommands: state.recentCommands,
    installedPacks: state.installedPacks,
    lastIconPackSyncAt: state.lastIconPackSyncAt,
    iconUsageStats: state.iconUsageStats,
    windowScalePercent: state.windowScalePercent,
    themePreset: state.themePreset,
    multicolorThemes: state.multicolorThemes,
  };
}

/**
 * Encola la grabación de la configuración con un debounce
 */
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
  // Estado de UI (no persistido)
  settingsOpen: boolean;
  editingButton: string | null;
  error: string | null;

  // Acciones
  setLanguage: (lang: AppLanguage) => void;
  setGridSize: (size: GridSize) => void;
  cycleGridSize: (direction: 1 | -1) => void;
  updateButton: (id: string, updates: Partial<ButtonConfig>) => void;
  setSettingsIconCorner: (corner: Corner) => void;
  setShortcutKey: (key: string) => void;
  setNumpadShortcuts: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setSoundOutputChannel: (channel: AppConfig['soundOutputChannel']) => void;
  setSoundTestSound: (sound: AppConfig['soundTestSound']) => void;
  previewSound: () => Promise<void>;
  setInactivityTimeout: (seconds: number) => void;
  setFadeOutDuration: (seconds: number) => void;
  setWindowScalePercent: (percent: number) => void;
  setThemePreset: (theme: ThemePreset) => void;
  setMulticolorThemes: (themes: BaseThemePreset[]) => void;
  addRecentCommand: (command: string) => void;
  clearRecentCommands: () => void;
  setSettingsOpen: (open: boolean) => void;
  setEditingButton: (id: string | null) => void;
  setError: (error: string | null) => void;
  trackIconUsage: (iconKey: string, amount?: number) => void;
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

  setLanguage: (lang) => {
    set({ language: lang });
    void i18n.changeLanguage(lang);
    get().saveConfig();
  },

  setGridSize: (size) => {
    const previous = get();
    const sizes = [...previous.pageGridSizes];
    const page = Math.min(previous.currentPage, sizes.length - 1);
    const oldSize = sizes[page] ?? previous.gridSize;
    const oldCap = pageCapacity(oldSize);
    const nextCap = pageCapacity(size);
    const start = pageStart(sizes, page);
    const currentPageButtons = previous.buttons.slice(start, start + oldCap);
    const nextPageButtons = Array.from({ length: nextCap }, (_, i) => {
      if (i < currentPageButtons.length) return currentPageButtons[i];
      return { id: `btn-${start + i}`, label: '', icon: '', command: '' };
    });
    const buttons = [
      ...previous.buttons.slice(0, start),
      ...nextPageButtons,
      ...previous.buttons.slice(start + oldCap),
    ];
    sizes[page] = size;
    set({
      gridSize: size,
      pageGridSizes: sizes,
      buttons,
      currentPage: page,
    });
    get().saveConfig();
  },

  cycleGridSize: (direction) => {
    const { gridSize, currentPage, pageGridSizes } = get();
    const current = gridSize;
    const idx = GRID_SIZES.findIndex(
      ([r, c]) => r === current[0] && c === current[1]
    );
    if (direction > 0 && idx === GRID_SIZES.length - 1) {
      get().addPage();
      return;
    }
    if (direction < 0 && idx === 0) {
      if (currentPage > 0) {
        const prevPage = currentPage - 1;
        const prevSize =
          pageGridSizes[prevPage] ?? GRID_SIZES[GRID_SIZES.length - 1];
        set({
          currentPage: prevPage,
          gridSize: prevSize,
        });
        get().saveConfig();
        return;
      }
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
    const normalized = key.trim().toUpperCase();
    set({ shortcutKey: normalized || DEFAULT_CONFIG.shortcutKey });
    const snapshot = getConfigSnapshot(get());
    void persistConfig(snapshot);
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

  setSoundOutputChannel: (channel) => {
    set({ soundOutputChannel: channel });
    setSfxOutputChannel(channel);
    get().saveConfig();
  },

  setSoundTestSound: (sound) => {
    set({ soundTestSound: sound });
    get().saveConfig();
  },

  previewSound: async () => {
    const sound = get().soundTestSound;
    if (sound === 'success') {
      await playSuccessSfx();
      return;
    }
    if (sound === 'error') {
      await playErrorSfx();
      return;
    }
    await playTapSfx();
  },

  setInactivityTimeout: (seconds) => {
    set({ inactivityTimeout: seconds });
    get().saveConfig();
  },

  setFadeOutDuration: (seconds) => {
    set({ fadeOutDuration: seconds });
    get().saveConfig();
  },

  setWindowScalePercent: (percent) => {
    const clamped = Math.min(400, Math.max(100, Math.round(percent)));
    set({ windowScalePercent: clamped });
    void invoke('apply_window_scale', { percent: clamped }).catch((e) =>
      console.warn('apply_window_scale:', e)
    );
    get().saveConfig();
  },

  setThemePreset: (theme) => {
    set({ themePreset: theme });
    get().saveConfig();
  },

  setMulticolorThemes: (themes) => {
    const unique = Array.from(new Set(themes)).slice(0, 4);
    set({ multicolorThemes: unique });
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
  trackIconUsage: (iconKey, amount = 1) => {
    const key = iconKey.trim();
    if (!key) return;
    set((s) => ({
      iconUsageStats: {
        ...s.iconUsageStats,
        [key]: (s.iconUsageStats[key] ?? 0) + Math.max(1, amount),
      },
    }));
    get().saveConfig();
  },
  setCurrentPage: (page) => {
    const { pageGridSizes } = get();
    const totalPages = Math.max(1, pageGridSizes.length);
    const next = Math.min(totalPages - 1, Math.max(0, page));
    const size = pageGridSizes[next] ?? get().gridSize;
    set({ currentPage: next, gridSize: size });
    get().saveConfig();
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
    const { pageGridSizes, buttons } = get();
    const nextSize: GridSize = GRID_SIZES[0];
    const nextCap = pageCapacity(nextSize);
    const nextStart = buttons.length;
    const nextButtons = [
      ...buttons,
      ...Array.from({ length: nextCap }, (_, i) => ({
        id: `btn-${nextStart + i}`,
        label: '',
        icon: '',
        command: '',
      })),
    ];
    const nextPageGridSizes = [...pageGridSizes, nextSize];
    set({
      buttons: nextButtons,
      pageGridSizes: nextPageGridSizes,
      currentPage: nextPageGridSizes.length - 1,
      gridSize: nextSize,
    });
    get().saveConfig();
  },

  executeButton: async (button) => {
    const { setError, addRecentCommand, trackIconUsage } = get();
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
        if (button.icon?.trim()) trackIconUsage(button.icon, 2);
      } else {
        const success = await invoke<boolean>('execute_command', { command: cmd });
        if (success) {
          addRecentCommand(cmd);
          if (button.icon?.trim()) trackIconUsage(button.icon, 2);
        }
      }
    } catch (err) {
      setError(String(err));
    }
  },

  loadConfig: async () => {
    try {
      const config = await invoke<AppConfig>('load_config');
      const normalizedPageGridSizes = normalizePageGridSizes(
        config.pageGridSizes,
        config.gridSize ?? DEFAULT_CONFIG.gridSize,
        (config.buttons ?? DEFAULT_CONFIG.buttons).length
      );
      const totalCapacity = normalizedPageGridSizes.reduce(
        (acc, size) => acc + pageCapacity(size),
        0
      );
      const pages = normalizedPageGridSizes;
      const savedRaw = config.currentPage;
      const savedPage =
        typeof savedRaw === 'number' && Number.isFinite(savedRaw)
          ? clampPageIndex(savedRaw, pages.length)
          : 0;
      const gridSizeForPage =
        pages[savedPage] ?? pages[0] ?? DEFAULT_CONFIG.gridSize;

      const resolvedConfig: AppConfig = {
        language: config.language ?? DEFAULT_CONFIG.language,
        gridSize: gridSizeForPage,
        pageGridSizes: normalizedPageGridSizes,
        currentPage: savedPage,
        buttons: normalizeButtons(
          config.buttons ?? DEFAULT_CONFIG.buttons,
          totalCapacity
        ),
        settingsIconCorner: config.settingsIconCorner ?? DEFAULT_CONFIG.settingsIconCorner,
        shortcutKey: config.shortcutKey ?? DEFAULT_CONFIG.shortcutKey,
        numpadShortcuts: config.numpadShortcuts ?? DEFAULT_CONFIG.numpadShortcuts,
        soundEnabled: config.soundEnabled ?? DEFAULT_CONFIG.soundEnabled,
        soundVolume: config.soundVolume ?? DEFAULT_CONFIG.soundVolume,
        soundOutputChannel:
          config.soundOutputChannel ?? DEFAULT_CONFIG.soundOutputChannel,
        soundTestSound: config.soundTestSound ?? DEFAULT_CONFIG.soundTestSound,
        inactivityTimeout: config.inactivityTimeout ?? DEFAULT_CONFIG.inactivityTimeout,
        fadeOutDuration: config.fadeOutDuration ?? DEFAULT_CONFIG.fadeOutDuration,
        recentCommands: config.recentCommands ?? DEFAULT_CONFIG.recentCommands,
        installedPacks: config.installedPacks ?? DEFAULT_CONFIG.installedPacks,
        lastIconPackSyncAt:
          config.lastIconPackSyncAt ?? DEFAULT_CONFIG.lastIconPackSyncAt,
        iconUsageStats: config.iconUsageStats ?? DEFAULT_CONFIG.iconUsageStats,
        windowScalePercent:
          config.windowScalePercent ?? DEFAULT_CONFIG.windowScalePercent,
        themePreset: config.themePreset ?? DEFAULT_CONFIG.themePreset,
        multicolorThemes:
          (config.multicolorThemes?.length
            ? config.multicolorThemes
            : DEFAULT_CONFIG.multicolorThemes) as BaseThemePreset[],
      };
      set(resolvedConfig);
      void i18n.changeLanguage(resolvedConfig.language);
      void invoke('apply_window_scale', {
        percent: resolvedConfig.windowScalePercent,
      }).catch(() => undefined);
      setSfxSettings(resolvedConfig.soundEnabled, resolvedConfig.soundVolume);
      setSfxOutputChannel(resolvedConfig.soundOutputChannel);
      lastShortcutSignature = getShortcutSignature(resolvedConfig);
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
    }
  },

  saveConfig: async () => {
    const s = get();
    const config: AppConfig = getConfigSnapshot(s);
    queueConfigSave(config);
  },

  resetDefaults: () => {
    set({
      ...DEFAULT_CONFIG,
      buttons: DEFAULT_CONFIG.buttons.map((b) => ({ ...b })),
    });
    void i18n.changeLanguage(DEFAULT_CONFIG.language);
    setSfxSettings(DEFAULT_CONFIG.soundEnabled, DEFAULT_CONFIG.soundVolume);
    setSfxOutputChannel(DEFAULT_CONFIG.soundOutputChannel);
    void invoke('apply_window_scale', {
      percent: DEFAULT_CONFIG.windowScalePercent,
    }).catch(() => undefined);
    get().saveConfig();
  },
}));
