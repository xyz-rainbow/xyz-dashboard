import { invoke } from '@tauri-apps/api/core';
import { toPackIconValue } from './iconLibrary';

export type IconSortMode = 'trending' | 'downloads' | 'newest';

export interface IconCatalogIcon {
  id: string;
  name: string;
  category: string;
  tags: string[];
  appHints: string[];
  createdAt: string;
  downloads: number;
  iconPath: string;
}

export interface IconCatalogPack {
  id: string;
  name: string;
  description: string;
  categories: string[];
  tags: string[];
  createdAt: string;
  downloads: number;
  trendingScore: number;
  iconCount: number;
  coverIconPath: string;
  installed: boolean;
  icons: IconCatalogIcon[];
}

export interface IconCatalogItem extends IconCatalogIcon {
  packId: string;
  packName: string;
  installed: boolean;
}

export async function loadIconCatalog(): Promise<IconCatalogPack[]> {
  return invoke<IconCatalogPack[]>('list_icon_packs');
}

export async function installIconPack(packId: string): Promise<boolean> {
  return invoke<boolean>('install_icon_pack', { packId });
}

/** Key for `iconUsageStats` / trending when icons are stored as `pack:id:id`. */
export function catalogIconUsageKey(
  packId: string,
  iconId: string
): string {
  return toPackIconValue(packId, iconId);
}

export function sortCatalogPacks(
  packs: IconCatalogPack[],
  mode: IconSortMode,
  usageStats: Record<string, number> = {}
): IconCatalogPack[] {
  const copy = [...packs];
  const packUsage = (pack: IconCatalogPack) =>
    pack.icons.reduce(
      (acc, icon) =>
        acc + (usageStats[catalogIconUsageKey(pack.id, icon.id)] ?? 0),
      0
    );

  if (mode === 'downloads') {
    copy.sort(
      (a, b) =>
        b.downloads + packUsage(b) * 5 - (a.downloads + packUsage(a) * 5)
    );
    return copy;
  }
  if (mode === 'newest') {
    copy.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return copy;
  }
  copy.sort(
    (a, b) =>
      b.trendingScore + packUsage(b) * 10 - (a.trendingScore + packUsage(a) * 10)
  );
  return copy;
}

export function flattenCatalogIcons(
  packs: IconCatalogPack[]
): IconCatalogItem[] {
  return packs.flatMap((pack) =>
    pack.icons.map((icon) => ({
      ...icon,
      packId: pack.id,
      packName: pack.name,
      installed: pack.installed,
    }))
  );
}

export function filterCatalogIcons(
  icons: IconCatalogItem[],
  query: string
): IconCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return icons;
  return icons.filter((icon) => {
    const haystack = [
      icon.name,
      icon.category,
      icon.packName,
      ...icon.tags,
      ...icon.appHints,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function groupIconsByCategory(
  icons: IconCatalogItem[]
): Record<string, IconCatalogItem[]> {
  return icons.reduce<Record<string, IconCatalogItem[]>>((acc, icon) => {
    const key = icon.category || 'uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(icon);
    return acc;
  }, {});
}

export function sortIconsByMode(
  icons: IconCatalogItem[],
  mode: IconSortMode,
  usageStats: Record<string, number> = {}
): IconCatalogItem[] {
  const copy = [...icons];
  if (mode === 'downloads') {
    copy.sort(
      (a, b) =>
        b.downloads +
          (usageStats[catalogIconUsageKey(b.packId, b.id)] ?? 0) * 5 -
          (a.downloads +
            (usageStats[catalogIconUsageKey(a.packId, a.id)] ?? 0) * 5)
    );
    return copy;
  }
  if (mode === 'newest') {
    copy.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return copy;
  }
  copy.sort(
    (a, b) =>
      (usageStats[catalogIconUsageKey(b.packId, b.id)] ?? 0) * 10 -
      (usageStats[catalogIconUsageKey(a.packId, a.id)] ?? 0) * 10
  );
  return copy;
}
