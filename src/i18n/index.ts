import { GAMES_CATALOG } from '../data/games';
import { EN_TRANSLATIONS } from './en';
import { LOCALES_GROUP_A } from './localesA';
import { LOCALES_GROUP_B } from './localesB';
import type { TranslationBundle } from './types';

const CATALOG_GAME_FALLBACKS: Record<string, { title: string; shortDescription: string }> = Object.fromEntries(
  GAMES_CATALOG.map((g) => [g.slug, { title: g.title, shortDescription: g.shortDescription }])
);

const BASE_EN_TRANSLATIONS: TranslationBundle = {
  ...EN_TRANSLATIONS,
  games: {
    ...CATALOG_GAME_FALLBACKS,
    ...EN_TRANSLATIONS.games,
  },
};

function deepMerge<T extends Record<string, unknown>>(base: T, override?: Record<string, unknown>): T {
  if (!override) return base;
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const val = override[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && base[key] && typeof base[key] === 'object') {
      result[key] = deepMerge(base[key] as Record<string, unknown>, val as Record<string, unknown>);
    } else if (typeof val === 'string' && val.trim().length > 0) {
      result[key] = val;
    }
  }
  return result as T;
}

const ALL_PARTIALS = {
  ...LOCALES_GROUP_A,
  ...LOCALES_GROUP_B,
};

export function getTranslations(
  langCode: string,
  adminOverrides?: Record<string, Record<string, string>>
): TranslationBundle {
  const code = (langCode || 'en').toLowerCase().split('-')[0];
  const localePartial = code === 'en' ? undefined : ALL_PARTIALS[code];
  let merged = deepMerge(
    BASE_EN_TRANSLATIONS as unknown as Record<string, unknown>,
    localePartial as unknown as Record<string, unknown>
  ) as unknown as TranslationBundle;

  // Apply flat dot-path overrides saved by Admin if present
  const langOverrides = adminOverrides?.[code];
  if (langOverrides && typeof langOverrides === 'object') {
    const structured: Record<string, unknown> = {};
    for (const [dotKey, value] of Object.entries(langOverrides)) {
      if (!value || typeof value !== 'string') continue;
      const parts = dotKey.split('.');
      let cursor = structured;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') {
          cursor[parts[i]] = {};
        }
        cursor = cursor[parts[i]] as Record<string, unknown>;
      }
      cursor[parts[parts.length - 1]] = value;
    }
    merged = deepMerge(merged as unknown as Record<string, unknown>, structured) as unknown as TranslationBundle;
  }

  return merged;
}
