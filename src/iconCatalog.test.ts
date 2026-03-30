import { describe, it, expect } from 'vitest';
import {
  filterCatalogIcons,
  groupIconsByCategory,
  sortIconsByMode,
  sortCatalogPacks,
  catalogIconUsageKey,
  type IconCatalogItem,
  type IconCatalogPack,
  type IconCatalogIcon,
} from './iconCatalog';

function icon(
  p: Partial<IconCatalogIcon> & Pick<IconCatalogIcon, 'id'>
): IconCatalogIcon {
  return {
    name: 'n',
    category: 'c',
    tags: [],
    appHints: [],
    createdAt: '2026-03-15',
    downloads: 50,
    iconPath: '/p',
    ...p,
  };
}

function item(
  p: Partial<IconCatalogItem> & Pick<IconCatalogItem, 'id' | 'packId'>
): IconCatalogItem {
  return {
    packName: 'Pn',
    name: 'Nm',
    category: 'c',
    tags: [],
    appHints: [],
    createdAt: '2026-03-15',
    downloads: 50,
    iconPath: '/p',
    installed: false,
    ...p,
  };
}

describe('filterCatalogIcons', () => {
  it('matches name, tags and pack name', () => {
    const icons = [
      item({
        id: '1',
        packId: 'a',
        name: 'Browser',
        tags: ['web'],
        packName: 'Web Pack',
      }),
      item({ id: '2', packId: 'a', name: 'Note', tags: ['text'] }),
    ];
    expect(filterCatalogIcons(icons, 'browse')).toHaveLength(1);
    expect(filterCatalogIcons(icons, 'web')).toHaveLength(1);
    expect(filterCatalogIcons(icons, 'pack')).toHaveLength(1);
  });
});

describe('groupIconsByCategory', () => {
  it('buckets by category', () => {
    const g = groupIconsByCategory([
      item({ id: '1', packId: 'p', category: 'alpha' }),
      item({ id: '2', packId: 'p', category: 'beta' }),
      item({ id: '3', packId: 'p', category: 'alpha' }),
    ]);
    expect(Object.keys(g).sort()).toEqual(['alpha', 'beta']);
    expect(g.alpha).toHaveLength(2);
  });
});

describe('catalogIconUsageKey', () => {
  it('uses stable pack ref', () => {
    expect(catalogIconUsageKey('dev-tools', 'terminal')).toBe(
      'pack:dev-tools:terminal'
    );
  });
});

describe('sortIconsByMode', () => {
  it('prioritizes usage for trending', () => {
    const icons = [
      item({
        id: 'a',
        packId: 'p',
      downloads: 100,
        createdAt: '2026-01-01',
      }),
      item({
        id: 'b',
        packId: 'p',
        downloads: 100,
        createdAt: '2026-01-02',
      }),
    ];
    const stats = { [catalogIconUsageKey('p', 'b')]: 5 };
    const sorted = sortIconsByMode(icons, 'trending', stats);
    expect(sorted[0].id).toBe('b');
  });
});

describe('sortCatalogPacks', () => {
  it('orders newest pack by createdAt', () => {
    const packs: IconCatalogPack[] = [
      {
        id: 'old',
        name: 'Old',
        description: '',
        categories: [],
        tags: [],
        createdAt: '2026-01-01',
        downloads: 999,
        trendingScore: 99,
        iconCount: 1,
        coverIconPath: '',
        installed: false,
        icons: [icon({ id: 'x', createdAt: '2026-01-01' })],
      },
      {
        id: 'new',
        name: 'New',
        description: '',
        categories: [],
        tags: [],
        createdAt: '2026-03-01',
        downloads: 1,
        trendingScore: 1,
        iconCount: 1,
        coverIconPath: '',
        installed: false,
        icons: [icon({ id: 'y', createdAt: '2026-03-01' })],
      },
    ];
    expect(sortCatalogPacks(packs, 'newest')[0].id).toBe('new');
  });
});
