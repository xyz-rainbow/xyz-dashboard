import type { ThemePreset } from './types';

type ThemeVars = Record<string, string>;
export type BaseThemePreset = Exclude<ThemePreset, 'multicolor'>;

export interface ThemePresetDef {
  id: BaseThemePreset;
  name: string;
  subtitle: string;
  cardBg: string;
  accent: string;
  vars: ThemeVars;
}

export const THEME_PRESETS: ThemePresetDef[] = [
  {
    id: 'lime',
    name: 'Lime',
    subtitle: 'Neon green glow',
    accent: '#aaff66',
    cardBg:
      'linear-gradient(135deg, rgba(165,255,77,0.9) 0%, rgba(36,215,110,0.8) 45%, rgba(19,120,78,0.9) 100%)',
    vars: {
      '--glass-bg': 'rgba(19, 32, 22, 0.30)',
      '--glass-bg-hover': 'rgba(22, 54, 26, 0.52)',
      '--glass-border': 'rgba(173, 255, 97, 0.30)',
      '--glass-border-hover': 'rgba(188, 255, 120, 0.55)',
      '--button-bg': 'rgba(139, 255, 99, 0.16)',
      '--button-bg-hover': 'rgba(168, 255, 107, 0.26)',
      '--text-primary': 'rgba(238, 255, 228, 0.95)',
      '--text-secondary': 'rgba(201, 255, 181, 0.68)',
      '--theme-ring': 'rgba(170,255,110,0.7)',
    },
  },
  {
    id: 'cyber',
    name: 'Cyber',
    subtitle: 'Magenta-cyan neon',
    accent: '#ff4fd5',
    cardBg:
      'linear-gradient(135deg, rgba(21,229,255,0.9) 0%, rgba(88,92,255,0.85) 38%, rgba(255,34,201,0.85) 100%)',
    vars: {
      '--glass-bg': 'rgba(15, 15, 34, 0.36)',
      '--glass-bg-hover': 'rgba(20, 18, 50, 0.58)',
      '--glass-border': 'rgba(0, 241, 255, 0.28)',
      '--glass-border-hover': 'rgba(255, 73, 216, 0.6)',
      '--button-bg': 'rgba(84, 123, 255, 0.18)',
      '--button-bg-hover': 'rgba(255, 72, 206, 0.30)',
      '--text-primary': 'rgba(237, 244, 255, 0.96)',
      '--text-secondary': 'rgba(190, 207, 255, 0.66)',
      '--theme-ring': 'rgba(255,77,219,0.8)',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    subtitle: 'Polar sky blend',
    accent: '#7cf6ff',
    cardBg:
      'linear-gradient(135deg, rgba(117,235,255,0.88) 0%, rgba(71,182,255,0.82) 34%, rgba(122,255,202,0.86) 68%, rgba(171,106,255,0.84) 100%)',
    vars: {
      '--glass-bg': 'rgba(13, 24, 35, 0.33)',
      '--glass-bg-hover': 'rgba(16, 40, 60, 0.55)',
      '--glass-border': 'rgba(119, 238, 255, 0.28)',
      '--glass-border-hover': 'rgba(167, 137, 255, 0.52)',
      '--button-bg': 'rgba(91, 200, 255, 0.16)',
      '--button-bg-hover': 'rgba(111, 255, 210, 0.26)',
      '--text-primary': 'rgba(233, 247, 255, 0.96)',
      '--text-secondary': 'rgba(181, 224, 248, 0.67)',
      '--theme-ring': 'rgba(131,242,255,0.76)',
    },
  },
  {
    id: 'darkmoon',
    name: 'Darkmoon',
    subtitle: 'Deep midnight',
    accent: '#b99cff',
    cardBg:
      'linear-gradient(135deg, rgba(22,24,33,0.96) 0%, rgba(33,36,50,0.96) 35%, rgba(57,49,84,0.95) 100%)',
    vars: {
      '--glass-bg': 'rgba(15, 15, 15, 0.20)',
      '--glass-bg-hover': 'rgba(15, 15, 15, 0.50)',
      '--glass-border': 'rgba(255, 255, 255, 0.08)',
      '--glass-border-hover': 'rgba(255, 255, 255, 0.20)',
      '--button-bg': 'rgba(255, 255, 255, 0.06)',
      '--button-bg-hover': 'rgba(255, 255, 255, 0.12)',
      '--text-primary': 'rgba(255, 255, 255, 0.90)',
      '--text-secondary': 'rgba(255, 255, 255, 0.50)',
      '--theme-ring': 'rgba(183,155,255,0.75)',
    },
  },
];

export function applyThemePreset(themeId: BaseThemePreset): void {
  const preset =
    THEME_PRESETS.find((p) => p.id === themeId) ??
    THEME_PRESETS.find((p) => p.id === 'darkmoon');
  if (!preset) return;
  const root = document.documentElement;
  Object.entries(preset.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function applyThemeMode(
  themeId: ThemePreset,
  multicolorThemes: BaseThemePreset[]
): void {
  const root = document.documentElement;
  root.classList.remove('multicolor-border');

  if (themeId !== 'multicolor') {
    applyThemePreset(themeId);
    return;
  }

  const picks =
    multicolorThemes.length > 0
      ? multicolorThemes
      : (THEME_PRESETS.map((p) => p.id) as BaseThemePreset[]);
  const base = picks[0] ?? 'darkmoon';
  applyThemePreset(base);
  const colors = picks
    .map((id) => THEME_PRESETS.find((t) => t.id === id)?.accent)
    .filter((v): v is string => Boolean(v));
  root.style.setProperty('--multi-gradient-colors', colors.join(', '));
  root.classList.add('multicolor-border');
}
