/**
 *  _____             _           _                          
 * |  __ \           (_)         | |                         
 * | |__) | __ _ _ __  _ __  _ __| |__   ___   __ _ _   _   
 * |  _  / / _` | '  \| | '_ \| '_ \ '_ \ / _ \ / _` | | | |  
 * | | \ \| (_| | | | | | | | | |_) | | | (_) | (_| | |_| |  
 * |_|  \_\\__,_|_| |_|_|_| |_|_.__/|_| |_|\___/ \__, |\__, |  
 *                                                __/ | __/ | 
 *                                               |___/ |___/  
 * 
 * Panel de Ajustes - XYZ Dashboard
 * #xyz-rainbow #xyz-rainbowtechnology #rainbowtechnology.xyz
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store';
import {
  ICON_LIBRARY,
  getLibraryIconComponent,
  getLibraryIconId,
  isLibraryIcon,
  isPackIcon,
  toLibraryIconValue,
  toPackIconValue,
} from '../iconLibrary';
import {
  type IconCatalogItem,
  filterCatalogIcons,
  flattenCatalogIcons,
  groupIconsByCategory,
  installIconPack,
  loadIconCatalog,
  sortIconsByMode,
  sortCatalogPacks,
  type IconSortMode,
} from '../iconCatalog';
import { useResolvedPackIconSrc } from '../hooks/useResolvedPackIcon';
import { toDisplaySrc } from '../utils/fileImageSrc';
import { THEME_PRESETS } from '../themePresets';
import type { ThemePreset, AppLanguage } from '../types';
import type { BaseThemePreset } from '../themePresets';

const TABS = [
  { id: 'buttons', labelKey: 'tabs.buttons' },
  { id: 'icons', labelKey: 'tabs.icons' },
  { id: 'appearance', labelKey: 'tabs.appearance' },
  { id: 'shortcuts', labelKey: 'tabs.shortcuts' },
  { id: 'sounds', labelKey: 'tabs.sounds' },
  { id: 'history', labelKey: 'tabs.history' },
  { id: 'language', labelKey: 'tabs.language' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SettingsPanel() {
  const { t } = useTranslation();
  const {
    language,
    setLanguage,
    settingsOpen,
    setSettingsOpen,
    gridSize,
    buttons,
    updateButton,
    shortcutKey,
    setShortcutKey,
    numpadShortcuts,
    setNumpadShortcuts,
    soundEnabled,
    setSoundEnabled,
    soundVolume,
    setSoundVolume,
    soundOutputChannel,
    setSoundOutputChannel,
    soundTestSound,
    setSoundTestSound,
    previewSound,
    trackIconUsage,
    iconUsageStats,
    settingsIconCorner,
    setSettingsIconCorner,
    inactivityTimeout,
    setInactivityTimeout,
    fadeOutDuration,
    setFadeOutDuration,
    recentCommands,
    clearRecentCommands,
    resetDefaults,
    windowScalePercent,
    setWindowScalePercent,
    themePreset,
    setThemePreset,
    multicolorThemes,
    setMulticolorThemes,
    setError,
  } = useStore();

  const [tab, setTab] = useState<TabId>('buttons');
  const [selectedBtn, setSelectedBtn] = useState<string | null>(null);

  // Reiniciar estado al abrir el panel, auto-seleccionar botón en edición
  useEffect(() => {
    if (settingsOpen) {
      setTab('buttons');
      const editing = useStore.getState().editingButton;
      setSelectedBtn(editing);
    }
  }, [settingsOpen]);

  // ESC para cerrar
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settingsOpen) {
        if (selectedBtn) {
          setSelectedBtn(null);
        } else {
          setSettingsOpen(false);
        }
      }
    },
    [settingsOpen, selectedBtn, setSettingsOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!settingsOpen) return null;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[20px]"
      onClick={() => setSettingsOpen(false)}
      data-no-drag
    >
      <div
        className="w-[92%] h-[88%] min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/10"
        style={{ background: 'rgba(10, 10, 10, 0.92)', backdropFilter: 'blur(32px)' }}
        onClick={(e) => e.stopPropagation()}
      >
            {/* Cabecera */}
            <div
              className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/8 cursor-move"
              data-drag-window
            >
              <span className="text-white/70 text-xs font-semibold tracking-wide">
                {t('settings')}
              </span>
              <button
                className="text-white/30 hover:text-white/60 text-xs px-2 py-0.5 rounded-md hover:bg-white/5 transition-colors"
                onClick={() => setSettingsOpen(false)}
                data-no-drag
              >
                {t('common.esc')}
              </button>
            </div>

            {/* Pestañas */}
            <div className="flex gap-0.5 px-3 pt-2 border-b border-white/8 shrink-0 overflow-x-auto no-scrollbar">
              {TABS.map((tItem) => (
                <button
                  key={tItem.id}
                  className={`px-3 py-1.5 text-[11px] rounded-t-lg transition-colors whitespace-nowrap ${
                    tab === tItem.id
                      ? 'text-white/80 bg-white/8 border-b-2 border-white/30'
                      : 'text-white/35 hover:text-white/55 hover:bg-white/4'
                  }`}
                  onClick={() => { setTab(tItem.id); setSelectedBtn(null); }}
                  data-no-drag
                >
                  {t(tItem.labelKey)}
                </button>
              ))}
            </div>

            {/* Contenido */}
            <div
              className="flex-1 min-h-0 overflow-y-auto scroll-smooth overscroll-contain px-4 py-3"
              data-no-drag
            >
              {tab === 'buttons' && (
                <TabButtons
                  buttons={buttons}
                  gridSize={gridSize}
                  selectedBtn={selectedBtn}
                  onSelectBtn={setSelectedBtn}
                  updateButton={updateButton}
                />
              )}
              {tab === 'appearance' && (
                <TabAppearance
                  settingsIconCorner={settingsIconCorner}
                  setSettingsIconCorner={setSettingsIconCorner}
                  windowScalePercent={windowScalePercent}
                  setWindowScalePercent={setWindowScalePercent}
                  themePreset={themePreset}
                  setThemePreset={setThemePreset}
                  multicolorThemes={multicolorThemes}
                  setMulticolorThemes={setMulticolorThemes}
                />
              )}
              {tab === 'icons' && (
                <TabIcons
                  buttons={buttons}
                  updateButton={updateButton}
                  trackIconUsage={trackIconUsage}
                  iconUsageStats={iconUsageStats}
                  setError={setError}
                />
              )}
              {tab === 'shortcuts' && (
                <TabShortcuts
                  shortcutKey={shortcutKey}
                  setShortcutKey={setShortcutKey}
                  numpadShortcuts={numpadShortcuts}
                  setNumpadShortcuts={setNumpadShortcuts}
                  inactivityTimeout={inactivityTimeout}
                  setInactivityTimeout={setInactivityTimeout}
                  fadeOutDuration={fadeOutDuration}
                  setFadeOutDuration={setFadeOutDuration}
                />
              )}
              {tab === 'sounds' && (
                <TabSounds
                  soundEnabled={soundEnabled}
                  setSoundEnabled={setSoundEnabled}
                  soundVolume={soundVolume}
                  setSoundVolume={setSoundVolume}
                  soundOutputChannel={soundOutputChannel}
                  setSoundOutputChannel={setSoundOutputChannel}
                  soundTestSound={soundTestSound}
                  setSoundTestSound={setSoundTestSound}
                  previewSound={previewSound}
                />
              )}
              {tab === 'history' && (
                <TabHistory
                  recentCommands={recentCommands}
                  clearRecentCommands={clearRecentCommands}
                  resetDefaults={resetDefaults}
                />
              )}
              {tab === 'language' && (
                <TabLanguage
                  language={language}
                  setLanguage={setLanguage}
                />
              )}
            </div>
      </div>
    </div>
  );
}

function ButtonIconPreview({ icon }: { icon?: string }) {
  const { t } = useTranslation();
  const isLib = isLibraryIcon(icon);
  const Lib = getLibraryIconComponent(icon);
  const isPack = isPackIcon(icon);
  const { src: packSrc } = useResolvedPackIconSrc(icon);

  if (!icon) return null;
  if (isLib && Lib) return <Lib className="w-10 h-10 text-white/80" />;
  if (isPack) {
    if (!packSrc) {
      return <span className="text-white/35 text-xs">{t('common.loading')}</span>;
    }
    return (
      <img
        src={packSrc}
        alt={t('settingsPanel.previewAlt')}
        className="w-10 h-10 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
        draggable={false}
      />
    );
  }
  return (
    <img
      src={toDisplaySrc(icon)}
      alt={t('settingsPanel.previewAlt')}
      className="w-10 h-10 object-contain"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
      draggable={false}
    />
  );
}

/* ── Tab: Buttons ──────────────────────────────────────────────────────── */

function TabButtons({
  buttons,
  gridSize,
  selectedBtn,
  onSelectBtn,
  updateButton,
}: {
  buttons: { id: string; label: string; command: string; icon?: string }[];
  gridSize: [number, number];
  selectedBtn: string | null;
  onSelectBtn: (id: string | null) => void;
  updateButton: (id: string, updates: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation();
  const [overwriteDetectedIcon, setOverwriteDetectedIcon] = useState(false);

  if (selectedBtn) {
    const btn = buttons.find((b) => b.id === selectedBtn);
    if (!btn) return null;
    const isLibIcon = isLibraryIcon(btn.icon);
    const selectedLibraryIconId = getLibraryIconId(btn.icon);

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col gap-3"
      >
        <button
          className="self-start text-[11px] text-white/30 hover:text-white/60 flex items-center gap-1"
          onClick={() => onSelectBtn(null)}
        >
          &larr; {t('common.back')}
        </button>

        <Section title={t('buttons.label')}>
          <input
            className="settings-input w-full"
            placeholder={t('buttons.displayName')}
            value={btn.label}
            onChange={(e) => updateButton(btn.id, { label: e.target.value })}
          />
        </Section>

        <Section title={t('buttons.execution')}>
          <div className="flex gap-2 mb-2">
            <TypeBadge
              active={btn.command.startsWith('http://') || btn.command.startsWith('https://')}
              label={t('buttons.web')}
            />
            <TypeBadge
              active={
                btn.command.length > 0 &&
                !btn.command.startsWith('http://') &&
                !btn.command.startsWith('https://')
              }
              label={t('buttons.command')}
            />
          </div>
          <input
            className="settings-input w-full font-mono"
            placeholder={
              btn.command.startsWith('http')
                ? t('settingsPanel.buttons.placeholderUrl')
                : t('settingsPanel.buttons.placeholderCommand')
            }
            value={btn.command}
            onChange={(e) => updateButton(btn.id, { command: e.target.value })}
          />
          <div className="mt-2 flex gap-2">
            <button
              className="text-[10px] px-2 py-1 rounded-md bg-white/8 hover:bg-white/14 text-white/70 transition-colors"
              onClick={() => {
                void (async () => {
                  const selected = await open({
                    multiple: false,
                    directory: false,
                    title: t('settingsPanel.buttons.openExecutableTitle'),
                  });
                  if (typeof selected !== 'string' || !selected) return;
                  let nextCommand = selected;
                  let detectedIcon: string | null = null;
                  try {
                    nextCommand = await invoke<string>('suggest_command_for_path', { path: selected });
                  } catch {
                    // Fallback to the selected path if native suggestion fails.
                  }
                  try {
                    detectedIcon = await invoke<string | null>('suggest_icon_for_path', {
                      path: selected,
                    });
                  } catch {
                    // Ignore icon detection errors and keep current icon.
                  }
                  updateButton(btn.id, {
                    command: nextCommand,
                    label: btn.label || selected.split(/[\\/]/).pop() || btn.label,
                    ...(detectedIcon &&
                    (overwriteDetectedIcon || !(btn.icon ?? '').trim())
                      ? { icon: detectedIcon }
                      : {}),
                  });
                })();
              }}
            >
              {t('buttons.selectFile')}
            </button>
          </div>
          <label className="mt-2 inline-flex items-center gap-2 text-[10px] text-white/45">
            <input
              type="checkbox"
              checked={overwriteDetectedIcon}
              onChange={(e) => setOverwriteDetectedIcon(e.target.checked)}
            />
            {t('buttons.overwriteIcon')}
          </label>
          <p className="text-white/25 text-[10px] mt-1">
            {t('settingsPanel.buttons.executionHint')}
          </p>
        </Section>

        <Section title={t('buttons.icon')}>
          <p className="text-white/35 text-[10px] mb-1">{t('buttons.libraryIcons')}</p>
          <div className="grid grid-cols-5 gap-1.5">
            {ICON_LIBRARY.map((entry) => {
              const Icon = entry.icon;
              const selected = isLibIcon && selectedLibraryIconId === entry.id;
              return (
                <button
                  key={entry.id}
                  title={entry.label}
                  className={`h-9 rounded-lg border transition-colors flex items-center justify-center ${
                    selected
                      ? 'bg-white/18 border-white/35 text-white/90'
                      : 'bg-white/6 border-white/10 text-white/60 hover:bg-white/12 hover:text-white/80'
                  }`}
                  onClick={() => updateButton(btn.id, { icon: toLibraryIconValue(entry.id) })}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              className="text-[10px] px-2 py-1 rounded-md bg-white/8 hover:bg-white/14 text-white/70 transition-colors"
              onClick={() => {
                void (async () => {
                  const selected = await open({
                    multiple: false,
                    directory: false,
                    title: t('settingsPanel.buttons.openIconTitle'),
                    filters: [
                      {
                        name: t('settingsPanel.buttons.imageFilterName'),
                        extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'],
                      },
                    ],
                  });
                  if (typeof selected !== 'string' || !selected) return;
                  updateButton(btn.id, { icon: selected });
                })();
              }}
            >
              {t('buttons.selectCustom')}
            </button>
            {btn.icon && (
              <button
                className="text-[10px] px-2 py-1 rounded-md bg-white/6 hover:bg-white/10 text-white/60 transition-colors"
                onClick={() => updateButton(btn.id, { icon: '' })}
              >
                {t('common.clear')}
              </button>
            )}
          </div>
          <input
            className="settings-input w-full font-mono mt-2"
            placeholder={t('settingsPanel.buttons.iconPathPlaceholder')}
            value={btn.icon || ''}
            onChange={(e) => updateButton(btn.id, { icon: e.target.value })}
          />
          {btn.icon && (
            <div className="mt-2 flex items-center justify-center p-3 rounded-lg bg-white/5 w-16 h-16">
              <ButtonIconPreview icon={btn.icon} />
            </div>
          )}
          <p className="text-white/25 text-[10px] mt-1">
            <Trans
              i18nKey="settingsPanel.buttons.iconHint"
              components={{
                c1: <code className="text-white/40" />,
                c2: <code className="text-white/40" />,
              }}
            />
          </p>
        </Section>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <p className="text-white/25 text-[10px] mb-2">
        {t('buttons.gridInfo', { cols: gridSize[1], rows: gridSize[0], cells: gridSize[0] * gridSize[1] })}
      </p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${gridSize[1]}, 1fr)` }}>
        {buttons.map((btn, i) => (
          <button
            key={btn.id}
            className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-colors cursor-pointer"
            onClick={() => onSelectBtn(btn.id)}
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5">
              {btn.label ? (
                <span className="text-sm font-medium text-white/60">
                  {btn.label.charAt(0).toUpperCase()}
                </span>
              ) : (
                <span className="text-white/15 text-xs">{i + 1}</span>
              )}
            </div>
            <span className="text-[9px] text-white/30 truncate max-w-full">
              {btn.label || t('common.empty')}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function TypeBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
        active
          ? 'bg-white/15 text-white/80'
          : 'bg-white/4 text-white/20'
      }`}
    >
      {label}
    </span>
  );
}

/* ── Tab: Icons ─────────────────────────────────────────────────────────── */

function TabIcons({
  buttons,
  updateButton,
  trackIconUsage,
  iconUsageStats,
  setError,
}: {
  buttons: { id: string; label: string; command: string; icon?: string }[];
  updateButton: (id: string, updates: Record<string, unknown>) => void;
  trackIconUsage: (iconKey: string, amount?: number) => void;
  iconUsageStats: Record<string, number>;
  setError: (msg: string | null) => void;
}) {
  const { t } = useTranslation();
  const [packs, setPacks] = useState<Awaited<ReturnType<typeof loadIconCatalog>>>([]);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<IconSortMode>('trending');
  const [selectedButtonId, setSelectedButtonId] = useState<string>(
    buttons[0]?.id ?? ''
  );
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(true);

  const refreshCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadIconCatalog();
      setPacks(next);
      const cats = flattenCatalogIcons(next).reduce<Record<string, boolean>>(
        (acc, icon) => {
          if (!(icon.category in acc)) acc[icon.category] = true;
          return acc;
        },
        {}
      );
      setExpandedCategories(cats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    if (!buttons.find((b) => b.id === selectedButtonId)) {
      setSelectedButtonId(buttons[0]?.id ?? '');
    }
  }, [buttons, selectedButtonId]);

  const sortedPacks = useMemo(
    () => sortCatalogPacks(packs, sortMode, iconUsageStats),
    [packs, sortMode, iconUsageStats]
  );
  const icons = useMemo(() => flattenCatalogIcons(sortedPacks), [sortedPacks]);
  const filteredIcons = useMemo(() => {
    const filtered = filterCatalogIcons(icons, query);
    return sortIconsByMode(filtered, sortMode, iconUsageStats);
  }, [icons, query, sortMode, iconUsageStats]);
  const grouped = useMemo(
    () => groupIconsByCategory(filteredIcons),
    [filteredIcons]
  );

  const selectedButton = buttons.find((b) => b.id === selectedButtonId);

  const applyIcon = (icon: IconCatalogItem, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!selectedButtonId) {
      setError(t('settingsPanel.icons.chooseTargetButton'));
      return;
    }
    setError(null);
    const ref = toPackIconValue(icon.packId, icon.id);
    updateButton(selectedButtonId, { icon: ref });
    trackIconUsage(ref, 1);
  };

  const onInstallPack = async (packId: string) => {
    try {
      await installIconPack(packId);
      await refreshCatalog();
    } catch (error) {
      console.warn('Failed to install icon pack:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      <Section title={t('settingsPanel.icons.toolbar')}>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="settings-input w-full text-[11px]"
            placeholder={t('settingsPanel.icons.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="settings-input w-full text-[11px]"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as IconSortMode)}
          >
            <option value="trending">{t('settingsPanel.icons.sortTrending')}</option>
            <option value="downloads">{t('settingsPanel.icons.sortDownloads')}</option>
            <option value="newest">{t('settingsPanel.icons.sortNewest')}</option>
          </select>
        </div>
      </Section>

      <Section title={t('settingsPanel.icons.targetButton')}>
        <select
          className="settings-input w-full text-[11px]"
          value={selectedButtonId}
          onChange={(e) => setSelectedButtonId(e.target.value)}
        >
          {buttons.map((b, index) => (
            <option key={b.id} value={b.id}>
              {index + 1}. {b.label || t('common.empty')}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-white/35 mt-1">
          {t('settingsPanel.icons.applyingTo')}{' '}
          {selectedButton?.label || t('common.empty')}
        </p>
      </Section>

      <Section title={t('settingsPanel.icons.packs')}>
        <div className="flex flex-col gap-2">
          {sortedPacks.map((pack) => (
            <div
              key={pack.id}
              className="rounded-lg border border-white/10 bg-white/5 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] text-white/75">{pack.name}</p>
                  <p className="text-[10px] text-white/35">
                    {t('settingsPanel.icons.packMeta', {
                      count: pack.iconCount,
                      downloads: pack.downloads,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-[10px] px-2 py-1 rounded-md bg-white/8 hover:bg-white/14 text-white/70 transition-colors"
                  onClick={() => void onInstallPack(pack.id)}
                >
                  {pack.installed ? t('common.update') : t('common.install')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('settingsPanel.icons.categories')}>
        {loading ? (
          <p className="text-[11px] text-white/35">{t('common.loading')}</p>
        ) : (
          Object.entries(grouped).map(([category, list]) => {
            const openCat = expandedCategories[category] ?? true;
            return (
              <div key={category} className="mb-2 rounded-lg border border-white/10">
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-[11px] text-white/65 hover:bg-white/6"
                  onClick={() =>
                    setExpandedCategories((s) => ({ ...s, [category]: !openCat }))
                  }
                >
                  {openCat ? '▾' : '▸'} {category} ({list.length})
                </button>
                {openCat && (
                  <div className="grid grid-flow-col grid-rows-5 sm:grid-rows-6 auto-cols-fr gap-2 p-2 bg-black/20 overflow-x-auto">
                    {list.map((icon) => (
                      <button
                        type="button"
                        key={`${icon.packId}-${icon.id}`}
                        className="min-h-[3.25rem] rounded-xl border border-zinc-600/40 bg-zinc-900/90 hover:bg-zinc-800/95 flex items-center justify-center p-2 shadow-inner"
                        onClick={(ev) => applyIcon(icon, ev)}
                        title={t('settingsPanel.icons.applyTitle', {
                          name: icon.name,
                          pack: icon.packName,
                          apply: t('settingsPanel.icons.applyVerb'),
                        })}
                      >
                        <img
                          src={toDisplaySrc(icon.iconPath)}
                          alt={icon.name}
                          className="w-9 h-9 max-w-full max-h-full object-contain [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.9))]"
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Section>
    </motion.div>
  );
}

/* ── Tab: Appearance ───────────────────────────────────────────────────── */

function TabAppearance({
  settingsIconCorner,
  setSettingsIconCorner,
  windowScalePercent,
  setWindowScalePercent,
  themePreset,
  setThemePreset,
  multicolorThemes,
  setMulticolorThemes,
}: {
  settingsIconCorner: 'tl' | 'tr' | 'bl' | 'br';
  setSettingsIconCorner: (corner: 'tl' | 'tr' | 'bl' | 'br') => void;
  windowScalePercent: number;
  setWindowScalePercent: (percent: number) => void;
  themePreset: ThemePreset;
  setThemePreset: (theme: ThemePreset) => void;
  multicolorThemes: BaseThemePreset[];
  setMulticolorThemes: (themes: BaseThemePreset[]) => void;
}) {
  const { t } = useTranslation();
  const corners: { id: 'tl' | 'tr' | 'bl' | 'br'; labelKey: string }[] = [
    { id: 'tl', labelKey: 'settingsPanel.appearance.corner.tl' },
    { id: 'tr', labelKey: 'settingsPanel.appearance.corner.tr' },
    { id: 'bl', labelKey: 'settingsPanel.appearance.corner.bl' },
    { id: 'br', labelKey: 'settingsPanel.appearance.corner.br' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      <Section title={t('settingsPanel.appearance.windowScale')}>
        <p className="text-white/35 text-[10px] mb-2">
          {t('settingsPanel.appearance.windowScaleHelp')}
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={100}
            max={400}
            step={5}
            value={windowScalePercent}
            onChange={(e) => setWindowScalePercent(Number(e.target.value))}
            className="flex-1 accent-white/40"
          />
          <span className="text-white/55 text-[11px] font-mono w-12 text-right">
            {windowScalePercent}%
          </span>
        </div>
      </Section>

      <Section title={t('settingsPanel.appearance.theme')}>
        <div className="grid grid-cols-2 gap-3">
          <button
            key="multicolor"
            type="button"
            onClick={() => setThemePreset('multicolor')}
            className={`rounded-2xl border p-2 text-left transition-all ${
              themePreset === 'multicolor'
                ? 'border-white/60 shadow-[0_0_0_1px_var(--theme-ring),0_0_18px_rgba(160,120,255,0.35)]'
                : 'border-white/15 hover:border-white/35'
            }`}
          >
            <div
              className="h-20 rounded-xl border border-white/10 relative overflow-hidden"
              style={{
                background:
                  'conic-gradient(from 0deg, #aaff66, #35e9ff, #8f82ff, #ff5dd7, #aaff66)',
              }}
            />
            <p className="mt-2 text-[12px] tracking-[0.14em] text-white/90 uppercase">
              {t('settingsPanel.themes.multicolor.name')}
            </p>
            <p className="text-[10px] text-white/45">
              {t('settingsPanel.themes.multicolor.subtitle')}
            </p>
          </button>
          {THEME_PRESETS.map((theme) => {
            const active = theme.id === themePreset;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setThemePreset(theme.id)}
                className={`rounded-2xl border p-2 text-left transition-all ${
                  active
                    ? 'border-white/60 shadow-[0_0_0_1px_var(--theme-ring),0_0_18px_rgba(160,120,255,0.35)]'
                    : 'border-white/15 hover:border-white/35'
                }`}
              >
                <div
                  className="h-20 rounded-xl border border-white/10 relative overflow-hidden"
                  style={{ background: theme.cardBg }}
                >
                  <span className="absolute left-3 top-3 h-4 w-4 rounded-md bg-white/28" />
                  <span className="absolute right-4 top-4 h-4 w-4 rounded-md bg-black/15" />
                  <span className="absolute left-6 bottom-4 h-5 w-5 rounded-md bg-white/20" />
                  <span className="absolute right-6 bottom-3 h-5 w-5 rounded-md bg-black/18" />
                </div>
                <p className="mt-2 text-[12px] tracking-[0.14em] text-white/90 uppercase">
                  {t(`settingsPanel.themes.${theme.id}.name`)}
                </p>
                <p className="text-[10px] text-white/45">
                  {t(`settingsPanel.themes.${theme.id}.subtitle`)}
                </p>
              </button>
            );
          })}
        </div>
        {themePreset === 'multicolor' && (
          <div className="mt-3">
            <p className="text-[10px] text-white/45 mb-2">
              {t('settingsPanel.appearance.multicolorMixHint')}
            </p>
            <div className="flex flex-wrap gap-2">
              {THEME_PRESETS.map((preset) => {
                const selected = multicolorThemes.includes(preset.id);
                return (
                  <button
                    key={`mix-${preset.id}`}
                    type="button"
                    onClick={() => {
                      const next = selected
                        ? multicolorThemes.filter((id) => id !== preset.id)
                        : [...multicolorThemes, preset.id];
                      setMulticolorThemes(next);
                    }}
                    className={`px-2 py-1 rounded-lg border text-[10px] ${
                      selected
                        ? 'border-white/45 bg-white/15 text-white/90'
                        : 'border-white/15 bg-white/6 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {t(`settingsPanel.themes.${preset.id}.name`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      <Section title={t('settingsPanel.appearance.settingsIconCorner')}>
        <div className="grid grid-cols-2 gap-2">
          {corners.map((corner) => (
            <button
              type="button"
              key={corner.id}
              className={`text-[11px] px-3 py-2 rounded-lg border transition-colors ${
                settingsIconCorner === corner.id
                  ? 'bg-white/16 border-white/35 text-white/85'
                  : 'bg-white/6 border-white/12 text-white/55 hover:bg-white/10'
              }`}
              onClick={() => setSettingsIconCorner(corner.id)}
            >
              {t(corner.labelKey)}
            </button>
          ))}
        </div>
      </Section>
      <Section title={t('settingsPanel.appearance.pagesNavTitle')}>
        <p className="text-white/35 text-[11px]">
          <Trans
            i18nKey="settingsPanel.appearance.pagesNav"
            components={{ mono: <span className="font-mono" /> }}
          />
        </p>
      </Section>
    </motion.div>
  );
}

/* ── Tab: Shortcuts ────────────────────────────────────────────────────── */

function TabShortcuts({
  shortcutKey,
  setShortcutKey,
  numpadShortcuts,
  setNumpadShortcuts,
  inactivityTimeout,
  setInactivityTimeout,
  fadeOutDuration,
  setFadeOutDuration,
}: {
  shortcutKey: string;
  setShortcutKey: (k: string) => void;
  numpadShortcuts: boolean;
  setNumpadShortcuts: (v: boolean) => void;
  inactivityTimeout: number;
  setInactivityTimeout: (v: number) => void;
  fadeOutDuration: number;
  setFadeOutDuration: (v: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      <Section title={t('settingsPanel.shortcuts.toggleShortcut')}>
        <p className="text-white/40 text-[11px] mb-2">
          {t('settingsPanel.shortcuts.ctrlAlt')}{' '}
          <span className="text-white/70 font-mono bg-white/10 px-1.5 py-0.5 rounded">
            {shortcutKey}
          </span>
        </p>
        <input
          className="settings-input w-full font-mono"
          placeholder={t('settingsPanel.shortcuts.keyPlaceholder')}
          value={shortcutKey}
          onChange={(e) => setShortcutKey(e.target.value)}
        />
      </Section>

      <Section title={t('settingsPanel.shortcuts.numpad')}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/50 text-[11px]">
            {t('settingsPanel.shortcuts.numpadHint')}
          </span>
          <IOSSwitch
            checked={numpadShortcuts}
            onChange={setNumpadShortcuts}
            ariaLabel={t('settingsPanel.shortcuts.numpadAria')}
          />
        </div>
      </Section>

      <Section title={t('settingsPanel.shortcuts.inactivity')}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={120}
            value={inactivityTimeout}
            onChange={(e) => setInactivityTimeout(Number(e.target.value))}
            className="flex-1 accent-white/40"
          />
          <span className="text-white/50 text-[11px] font-mono w-10 text-right">
            {inactivityTimeout}s
          </span>
        </div>
      </Section>

      <Section title={t('settingsPanel.shortcuts.fadeOut')}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={10}
            value={fadeOutDuration}
            onChange={(e) => setFadeOutDuration(Number(e.target.value))}
            className="flex-1 accent-white/40"
          />
          <span className="text-white/50 text-[11px] font-mono w-10 text-right">
            {fadeOutDuration}s
          </span>
        </div>
      </Section>
    </motion.div>
  );
}

/* ── Tab: Sounds ────────────────────────────────────────────────────────── */

function TabSounds({
  soundEnabled,
  setSoundEnabled,
  soundVolume,
  setSoundVolume,
  soundOutputChannel,
  setSoundOutputChannel,
  soundTestSound,
  setSoundTestSound,
  previewSound,
}: {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  soundVolume: number;
  setSoundVolume: (v: number) => void;
  soundOutputChannel: 'stereo' | 'left' | 'right' | 'mono';
  setSoundOutputChannel: (v: 'stereo' | 'left' | 'right' | 'mono') => void;
  soundTestSound: 'tap' | 'success' | 'error';
  setSoundTestSound: (v: 'tap' | 'success' | 'error') => void;
  previewSound: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      <Section title={t('settingsPanel.sounds.title')}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-white/50 text-[11px]">
            {t('settingsPanel.sounds.enableHint')}
          </span>
          <IOSSwitch
            checked={soundEnabled}
            onChange={setSoundEnabled}
            ariaLabel={t('settingsPanel.sounds.ariaEffects')}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={soundVolume}
            onChange={(e) => {
              setSoundVolume(Number(e.target.value));
              void previewSound().catch((error) => {
                console.warn('Sound preview failed:', error);
              });
            }}
            className="flex-1 accent-white/40"
          />
          <span className="text-white/50 text-[11px] font-mono w-12 text-right">
            {soundVolume}%
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select
            className="settings-input w-full text-[11px]"
            value={soundOutputChannel}
            onChange={(e) =>
              setSoundOutputChannel(
                e.target.value as 'stereo' | 'left' | 'right' | 'mono'
              )
            }
          >
            <option value="stereo">{t('settingsPanel.sounds.stereo')}</option>
            <option value="left">{t('settingsPanel.sounds.leftOnly')}</option>
            <option value="right">{t('settingsPanel.sounds.rightOnly')}</option>
            <option value="mono">{t('settingsPanel.sounds.mono')}</option>
          </select>
          <select
            className="settings-input w-full text-[11px]"
            value={soundTestSound}
            onChange={(e) =>
              setSoundTestSound(e.target.value as 'tap' | 'success' | 'error')
            }
          >
            <option value="tap">{t('settingsPanel.sounds.testTap')}</option>
            <option value="success">{t('settingsPanel.sounds.testSuccess')}</option>
            <option value="error">{t('settingsPanel.sounds.testError')}</option>
          </select>
        </div>
        <button
          className="mt-2 text-[10px] px-2 py-1 rounded-md bg-white/8 hover:bg-white/14 text-white/70 transition-colors"
          onClick={() => {
            void previewSound().catch((error) => {
              console.warn('Sound preview failed:', error);
            });
          }}
        >
          {t('settingsPanel.sounds.playPreview')}
        </button>
      </Section>
    </motion.div>
  );
}

/* ── Tab: History ──────────────────────────────────────────────────────── */

function TabHistory({
  recentCommands,
  clearRecentCommands,
  resetDefaults,
}: {
  recentCommands: string[];
  clearRecentCommands: () => void;
  resetDefaults: () => void;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {recentCommands.length === 0 ? (
        <p className="text-white/25 text-[11px]">{t('settingsPanel.history.empty')}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {recentCommands.map((cmd, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/4"
            >
              <span className="text-white/20 text-[10px] w-4">{i + 1}</span>
              <span className="text-white/50 text-[11px] font-mono truncate flex-1">
                {cmd}
              </span>
            </div>
          ))}
          <button
            className="text-[10px] text-white/25 hover:text-white/50 mt-2 self-start"
            onClick={clearRecentCommands}
          >
            {t('settingsPanel.history.clearHistory')}
          </button>
        </div>
      )}

      <div className="mt-6 pt-3 border-t border-white/8">
        <button
          className="text-[11px] text-red-400/50 hover:text-red-400/80 transition-colors"
          onClick={resetDefaults}
        >
          {t('common.reset')}
        </button>
      </div>
    </motion.div>
  );
}

/* ── Tab: Language ─────────────────────────────────────────────────────── */

function TabLanguage({
  language,
  setLanguage,
}: {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}) {
  const { t } = useTranslation();
  const langs: { id: AppLanguage; label: string }[] = [
    { id: 'en', label: t('language.en') },
    { id: 'es', label: t('language.es') },
    { id: 'ca', label: t('language.ca') },
    { id: 'ja', label: t('language.ja') },
    { id: 'zh', label: t('language.zh') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      <Section title={t('language.select')}>
        <div className="grid grid-cols-2 gap-2">
          {langs.map((lang) => (
            <button
              type="button"
              key={lang.id}
              className={`text-[11px] px-3 py-2 rounded-lg border transition-colors ${
                language === lang.id
                  ? 'bg-white/16 border-white/35 text-white/85'
                  : 'bg-white/6 border-white/12 text-white/55 hover:bg-white/10'
              }`}
              onClick={() => setLanguage(lang.id)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </Section>
    </motion.div>
  );
}

/* ── Shared ────────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-white/50 text-[10px] font-medium uppercase tracking-wider mb-1.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

function IOSSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    setPulseKey((v) => v + 1);
  }, [checked]);

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ease-out border ${
        checked
          ? 'bg-emerald-400/80 border-emerald-300/60'
          : 'bg-white/15 border-white/20'
      }`}
      whileTap={{ scale: 0.97 }}
    >
      <motion.span
        key={pulseKey}
        className="absolute inset-0 rounded-full pointer-events-none"
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: [0, 0.32, 0], scale: [0.86, 1.04, 1.14] }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        style={{
          background: checked
            ? 'radial-gradient(circle, rgba(110,231,183,0.45) 0%, rgba(16,185,129,0.1) 70%, transparent 100%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 70%, transparent 100%)',
        }}
      />
      <motion.span
        className="inline-block h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
        animate={{
          x: checked ? 20 : 2,
          scale: [1, 1.08, 1],
        }}
        transition={{
          x: { type: 'spring', stiffness: 520, damping: 30, mass: 0.55 },
          scale: { duration: 0.18, ease: 'easeOut' },
        }}
      />
    </motion.button>
  );
}

