import type { ComponentType, SVGProps } from 'react';
import {
  Terminal,
  Folder,
  Globe,
  Code2,
  Play,
  Rocket,
  Wrench,
  FileCode2,
  Bot,
  Shield,
} from 'lucide-react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const ICON_LIBRARY: { id: string; label: string; icon: IconComponent }[] = [
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'folder', label: 'Folder', icon: Folder },
  { id: 'globe', label: 'Web', icon: Globe },
  { id: 'code2', label: 'Code', icon: Code2 },
  { id: 'play', label: 'Play', icon: Play },
  { id: 'rocket', label: 'Rocket', icon: Rocket },
  { id: 'wrench', label: 'Tools', icon: Wrench },
  { id: 'filecode2', label: 'Script', icon: FileCode2 },
  { id: 'bot', label: 'Bot', icon: Bot },
  { id: 'shield', label: 'Shield', icon: Shield },
];

const ICON_MAP = new Map(ICON_LIBRARY.map((entry) => [entry.id, entry.icon]));

export function isLibraryIcon(value?: string): boolean {
  return typeof value === 'string' && value.startsWith('lib:');
}

export function getLibraryIconId(value?: string): string {
  if (!value || !isLibraryIcon(value)) return '';
  return value.slice(4);
}

export function toLibraryIconValue(iconId: string): string {
  return `lib:${iconId}`;
}

export function getLibraryIconComponent(value?: string): IconComponent | null {
  const id = getLibraryIconId(value);
  return ICON_MAP.get(id) ?? null;
}
