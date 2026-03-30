import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store';
import {
  ICON_LIBRARY,
  getLibraryIconComponent,
  getLibraryIconId,
  isLibraryIcon,
  toLibraryIconValue,
} from '../iconLibrary';

const TABS = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'shortcuts', label: 'Shortcuts' },
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
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/8">
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
                {tab === 'shortcuts' && (
                  <TabShortcuts
                    key="shortcuts"
                    shortcutKey={shortcutKey}
                    setShortcutKey={setShortcutKey}
                    numpadShortcuts={numpadShortcuts}
                    setNumpadShortcuts={setNumpadShortcuts}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    soundVolume={soundVolume}
                    setSoundVolume={setSoundVolume}
                    inactivityTimeout={inactivityTimeout}
                    setInactivityTimeout={setInactivityTimeout}
                    fadeOutDuration={fadeOutDuration}
                    setFadeOutDuration={setFadeOutDuration}
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
  if (selectedBtn) {
    const btn = buttons.find((b) => b.id === selectedBtn);
    if (!btn) return null;
    const isLibIcon = isLibraryIcon(btn.icon);
    const selectedLibraryIconId = getLibraryIconId(btn.icon);
    const LibraryPreviewIcon = getLibraryIconComponent(btn.icon);

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
                  try {
                    nextCommand = await invoke<string>('suggest_command_for_path', { path: selected });
                  } catch {
                    // Fallback to the selected path if native suggestion fails.
                  }
                  updateButton(btn.id, {
                    command: nextCommand,
                    label: btn.label || selected.split(/[\\/]/).pop() || btn.label,
                  });
                })();
              }}
            >
              Select file or script...
            </button>
          </div>
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
              {isLibIcon && LibraryPreviewIcon ? (
                <LibraryPreviewIcon className="w-10 h-10 text-white/80" />
              ) : (
                <img
                  src={btn.icon}
                  alt="preview"
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  draggable={false}
                />
              )}
            </div>
          )}
          <p className="text-white/25 text-[10px] mt-1">
            Use library icon, custom file picker, or manual path. Empty shows label initial.
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
  soundEnabled,
  setSoundEnabled,
  soundVolume,
  setSoundVolume,
  inactivityTimeout,
  setInactivityTimeout,
  fadeOutDuration,
  setFadeOutDuration,
}: {
  shortcutKey: string;
  setShortcutKey: (k: string) => void;
  numpadShortcuts: boolean;
  setNumpadShortcuts: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  soundVolume: number;
  setSoundVolume: (v: number) => void;
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
            onChange={(e) => setSoundVolume(Number(e.target.value))}
            className="flex-1 accent-white/40"
          />
          <span className="text-white/50 text-[11px] font-mono w-12 text-right">
            {soundVolume}%
          </span>
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
