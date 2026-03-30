import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const TABS = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'icons', label: 'Icons' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'sounds', label: 'Sounds' },
  { id: 'history', label: 'History' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SettingsPanel() {
  const {
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
  } = useStore();

  const [tab, setTab] = useState<TabId>('buttons');
  const [selectedBtn, setSelectedBtn] = useState<string | null>(null);

  // Reset state when panel opens, auto-select editing button
  useEffect(() => {
    if (settingsOpen) {
      setTab('buttons');
      const editing = useStore.getState().editingButton;
      setSelectedBtn(editing);
    }
  }, [settingsOpen]);

  // ESC to close
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
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[20px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSettingsOpen(false)}
          data-no-drag
        >
          <motion.div
            className="w-[92%] h-[88%] flex flex-col overflow-hidden rounded-2xl border border-white/10"
            style={{ background: 'rgba(10, 10, 10, 0.92)', backdropFilter: 'blur(32px)' }}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/8 cursor-move"
              data-drag-window
            >
              <span className="text-white/70 text-xs font-semibold tracking-wide">
                Settings
              </span>
              <button
                className="text-white/30 hover:text-white/60 text-xs px-2 py-0.5 rounded-md hover:bg-white/5 transition-colors"
                onClick={() => setSettingsOpen(false)}
                data-no-drag
              >
                ESC
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 px-3 pt-2 border-b border-white/8">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`px-3 py-1.5 text-[11px] rounded-t-lg transition-colors ${
                    tab === t.id
                      ? 'text-white/80 bg-white/8 border-b-2 border-white/30'
                      : 'text-white/35 hover:text-white/55 hover:bg-white/4'
                  }`}
                  onClick={() => { setTab(t.id); setSelectedBtn(null); }}
                  data-no-drag
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3" data-no-drag>
              <AnimatePresence mode="wait">
                {tab === 'buttons' && (
                  <TabButtons
                    key="buttons"
                    buttons={buttons}
                    gridSize={gridSize}
                    selectedBtn={selectedBtn}
                    onSelectBtn={setSelectedBtn}
                    updateButton={updateButton}
                  />
                )}
                {tab === 'appearance' && (
                  <TabAppearance
                    key="appearance"
                    settingsIconCorner={settingsIconCorner}
                    setSettingsIconCorner={setSettingsIconCorner}
                  />
                )}
                {tab === 'icons' && (
                  <TabIcons
                    key="icons"
                    buttons={buttons}
                    updateButton={updateButton}
                    trackIconUsage={trackIconUsage}
                    iconUsageStats={iconUsageStats}
                  />
                )}
                {tab === 'shortcuts' && (
                  <TabShortcuts
                    key="shortcuts"
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
                    key="sounds"
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
                    key="history"
                    recentCommands={recentCommands}
                    clearRecentCommands={clearRecentCommands}
                    resetDefaults={resetDefaults}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ButtonIconPreview({ icon }: { icon?: string }) {
  const isLib = isLibraryIcon(icon);
  const Lib = getLibraryIconComponent(icon);
  const isPack = isPackIcon(icon);
  const { src: packSrc } = useResolvedPackIconSrc(icon);

  if (!icon) return null;
  if (isLib && Lib) return <Lib className="w-10 h-10 text-white/80" />;
  if (isPack) {
    if (!packSrc) {
      return <span className="text-white/35 text-xs">Loading…</span>;
    }
    return (
      <img
        src={packSrc}
        alt="preview"
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
      src={icon}
      alt="preview"
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
          &larr; Back
        </button>

        <Section title="Label">
          <input
            className="settings-input w-full"
            placeholder="Display name"
            value={btn.label}
            onChange={(e) => updateButton(btn.id, { label: e.target.value })}
          />
        </Section>

        <Section title="Execution">
          <div className="flex gap-2 mb-2">
            <TypeBadge
              active={btn.command.startsWith('http://') || btn.command.startsWith('https://')}
              label="Web"
            />
            <TypeBadge
              active={
                btn.command.length > 0 &&
                !btn.command.startsWith('http://') &&
                !btn.command.startsWith('https://')
              }
              label="Command"
            />
          </div>
          <input
            className="settings-input w-full font-mono"
            placeholder={
              btn.command.startsWith('http')
                ? 'https://example.com'
                : 'e.g. firefox, ls -la, xdotool ...'
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
                    title: 'Select executable or script',
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
              Select file or script...
            </button>
          </div>
          <label className="mt-2 inline-flex items-center gap-2 text-[10px] text-white/45">
            <input
              type="checkbox"
              checked={overwriteDetectedIcon}
              onChange={(e) => setOverwriteDetectedIcon(e.target.checked)}
            />
            Overwrite existing icon when auto-detected
          </label>
          <p className="text-white/25 text-[10px] mt-1">
            URLs open in browser. Anything else runs as a shell command.
          </p>
        </Section>

        <Section title="Icon">
          <p className="text-white/35 text-[10px] mb-1">Library icons</p>
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
                    title: 'Select custom icon',
                    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }],
                  });
                  if (typeof selected !== 'string' || !selected) return;
                  updateButton(btn.id, { icon: selected });
                })();
              }}
            >
              Select custom icon...
            </button>
            {btn.icon && (
              <button
                className="text-[10px] px-2 py-1 rounded-md bg-white/6 hover:bg-white/10 text-white/60 transition-colors"
                onClick={() => updateButton(btn.id, { icon: '' })}
              >
                Clear
              </button>
            )}
          </div>
          <input
            className="settings-input w-full font-mono mt-2"
            placeholder="/path/to/icon.svg"
            value={btn.icon || ''}
            onChange={(e) => updateButton(btn.id, { icon: e.target.value })}
          />
          {btn.icon && (
            <div className="mt-2 flex items-center justify-center p-3 rounded-lg bg-white/5 w-16 h-16">
              <ButtonIconPreview icon={btn.icon} />
            </div>
          )}
          <p className="text-white/25 text-[10px] mt-1">
            Library <code className="text-white/40">lib:</code>, catalog{' '}
            <code className="text-white/40">pack:id:id</code>, file path, or empty
            for label initial.
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
        Grid {gridSize[1]}x{gridSize[0]} &mdash; {gridSize[0] * gridSize[1]} cells
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
              {btn.label || 'Empty'}
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
}: {
  buttons: { id: string; label: string; command: string; icon?: string }[];
  updateButton: (id: string, updates: Record<string, unknown>) => void;
  trackIconUsage: (iconKey: string, amount?: number) => void;
  iconUsageStats: Record<string, number>;
}) {
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

  const applyIcon = (icon: IconCatalogItem) => {
    if (!selectedButtonId) return;
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
      <Section title="Toolbar">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="settings-input w-full text-[11px]"
            placeholder="Search icons, tags, apps..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="settings-input w-full text-[11px]"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as IconSortMode)}
          >
            <option value="trending">Trending</option>
            <option value="downloads">Most downloaded</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </Section>

      <Section title="Target Button">
        <select
          className="settings-input w-full text-[11px]"
          value={selectedButtonId}
          onChange={(e) => setSelectedButtonId(e.target.value)}
        >
          {buttons.map((b, index) => (
            <option key={b.id} value={b.id}>
              {index + 1}. {b.label || 'Empty'}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-white/35 mt-1">
          Applying icon to: {selectedButton?.label || 'Empty button'}
        </p>
      </Section>

      <Section title="Packs">
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
                    {pack.iconCount} icons • {pack.downloads} downloads
                  </p>
                </div>
                <button
                  className="text-[10px] px-2 py-1 rounded-md bg-white/8 hover:bg-white/14 text-white/70 transition-colors"
                  onClick={() => void onInstallPack(pack.id)}
                >
                  {pack.installed ? 'Update' : 'Install'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Categories">
        {loading ? (
          <p className="text-[11px] text-white/35">Loading icons...</p>
        ) : (
          Object.entries(grouped).map(([category, list]) => {
            const open = expandedCategories[category] ?? true;
            return (
              <div key={category} className="mb-2 rounded-lg border border-white/10">
                <button
                  className="w-full px-2 py-1.5 text-left text-[11px] text-white/65 hover:bg-white/6"
                  onClick={() =>
                    setExpandedCategories((s) => ({ ...s, [category]: !open }))
                  }
                >
                  {open ? '▾' : '▸'} {category} ({list.length})
                </button>
                {open && (
                  <div className="grid grid-cols-6 gap-1.5 p-2">
                    {list.map((icon) => (
                      <button
                        key={`${icon.packId}-${icon.id}`}
                        className="h-10 rounded-lg border border-white/10 bg-white/6 hover:bg-white/14 flex items-center justify-center"
                        onClick={() => applyIcon(icon)}
                        title={`${icon.name} (${icon.packName})`}
                      >
                        <img
                          src={icon.iconPath}
                          alt={icon.name}
                          className="w-6 h-6 object-contain"
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
}: {
  settingsIconCorner: 'tl' | 'tr' | 'bl' | 'br';
  setSettingsIconCorner: (corner: 'tl' | 'tr' | 'bl' | 'br') => void;
}) {
  const corners: { id: 'tl' | 'tr' | 'bl' | 'br'; label: string }[] = [
    { id: 'tl', label: 'Top Left' },
    { id: 'tr', label: 'Top Right' },
    { id: 'bl', label: 'Bottom Left' },
    { id: 'br', label: 'Bottom Right' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      <Section title="Settings Icon Position">
        <div className="grid grid-cols-2 gap-2">
          {corners.map((corner) => (
            <button
              key={corner.id}
              className={`text-[11px] px-3 py-2 rounded-lg border transition-colors ${
                settingsIconCorner === corner.id
                  ? 'bg-white/16 border-white/35 text-white/85'
                  : 'bg-white/6 border-white/12 text-white/55 hover:bg-white/10'
              }`}
              onClick={() => setSettingsIconCorner(corner.id)}
            >
              {corner.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Pages Navigation">
        <p className="text-white/35 text-[11px]">
          Use <span className="font-mono">Arrow Left/Right</span> or mouse wheel over the grid to move between pages when you have more than 9 buttons.
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
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      <Section title="Toggle Shortcut">
        <p className="text-white/40 text-[11px] mb-2">
          Ctrl + Alt +{' '}
          <span className="text-white/70 font-mono bg-white/10 px-1.5 py-0.5 rounded">
            {shortcutKey}
          </span>
        </p>
        <input
          className="settings-input w-full font-mono"
          placeholder="Key (e.g. P, A, F1)"
          value={shortcutKey}
          onChange={(e) => setShortcutKey(e.target.value)}
        />
      </Section>

      <Section title="Numpad Shortcuts">
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/50 text-[11px]">
            Ctrl+Alt+Numpad1-9 for silent execution (3x3 grid only)
          </span>
          <IOSSwitch
            checked={numpadShortcuts}
            onChange={setNumpadShortcuts}
            ariaLabel="Toggle numpad shortcuts"
          />
        </div>
      </Section>

      <Section title="Inactivity Timeout">
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

      <Section title="Fade-out Duration">
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
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      <Section title="Sound Effects">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-white/50 text-[11px]">
            Enable modern, low-frequency UI sounds
          </span>
          <IOSSwitch
            checked={soundEnabled}
            onChange={setSoundEnabled}
            ariaLabel="Toggle sound effects"
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
            <option value="stereo">Stereo</option>
            <option value="left">Left only</option>
            <option value="right">Right only</option>
            <option value="mono">Mono</option>
          </select>
          <select
            className="settings-input w-full text-[11px]"
            value={soundTestSound}
            onChange={(e) =>
              setSoundTestSound(e.target.value as 'tap' | 'success' | 'error')
            }
          >
            <option value="tap">Test: Tap</option>
            <option value="success">Test: Success</option>
            <option value="error">Test: Error</option>
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
          Play selected sound
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
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {recentCommands.length === 0 ? (
        <p className="text-white/25 text-[11px]">No recent commands yet.</p>
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
            Clear history
          </button>
        </div>
      )}

      <div className="mt-6 pt-3 border-t border-white/8">
        <button
          className="text-[11px] text-red-400/50 hover:text-red-400/80 transition-colors"
          onClick={resetDefaults}
        >
          Reset everything to defaults
        </button>
      </div>
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
