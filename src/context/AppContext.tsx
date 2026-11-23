import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGE_CODES, MONETAG_CONFIG, SITE_CONFIG, getLanguageInfo, type LanguageInfo } from '../config/site';
import { GAMES_CATALOG, type GameCatalogItem } from '../data/games';
import { getTranslations } from '../i18n';
import { saveLanguagePreference } from '../i18n/detectLanguage';
import type { TranslationBundle } from '../i18n/types';
import {
  loadFavorites,
  loadPreferences,
  loadRecentGames,
  loadStats,
  saveFavorites,
  savePreferences,
  saveRecentGames,
  saveStats,
  type GameLocalStat,
  type RecentGameItem,
  type UserPreferences,
} from '../utils/storage';

export interface ServerPublicConfig {
  settings: {
    siteName: string;
    tagline: string;
    adsEnabled: boolean;
    monetagDirectLink: string;
    adsDisclosure: string;
    maintenanceMode: boolean;
    analyticsEnabled: boolean;
  };
  gameOverrides: Record<
    string,
    {
      enabled: boolean;
      customTitle?: string;
      customDescription?: string;
      seoTitle?: string;
      seoDescription?: string;
    }
  >;
  categoryOverrides: Record<string, { enabled: boolean; label?: string }>;
  translationOverrides: Record<string, Record<string, string>>;
  playsByGame: Record<string, number>;
}

const DEFAULT_SERVER_CONFIG: ServerPublicConfig = {
  settings: {
    siteName: SITE_CONFIG.brandName,
    tagline: SITE_CONFIG.tagline,
    adsEnabled: true,
    monetagDirectLink: MONETAG_CONFIG.directLink,
    adsDisclosure: MONETAG_CONFIG.disclosureLabel,
    maintenanceMode: false,
    analyticsEnabled: true,
  },
  gameOverrides: {},
  categoryOverrides: {},
  translationOverrides: {},
  playsByGame: {},
};

interface AppContextValue {
  lang: string;
  langInfo: LanguageInfo;
  t: TranslationBundle;
  setLang: (code: string) => void;
  prefs: UserPreferences;
  toggleTheme: () => void;
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleAds: () => void;
  favorites: string[];
  toggleFavorite: (slug: string) => void;
  isFavorite: (slug: string) => boolean;
  recentGames: RecentGameItem[];
  stats: Record<string, GameLocalStat>;
  recordSessionStart: (slug: string) => void;
  recordGameResult: (slug: string, score: number, won: boolean, durationSec: number) => void;
  serverConfig: ServerPublicConfig;
  refreshServerConfig: () => Promise<void>;
  visibleGames: GameCatalogItem[];
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ initialLang?: string; children: React.ReactNode }> = ({
  initialLang = 'en',
  children,
}) => {
  const [lang, setLangState] = useState<string>(() =>
    LANGUAGE_CODES.includes(initialLang) ? initialLang : 'en'
  );
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences());
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [recentGames, setRecentGames] = useState<RecentGameItem[]>(() => loadRecentGames());
  const [stats, setStats] = useState<Record<string, GameLocalStat>>(() => loadStats());
  const [serverConfig, setServerConfig] = useState<ServerPublicConfig>(DEFAULT_SERVER_CONFIG);
  // Session Bearer token lives exclusively in React memory (never localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const langInfo = useMemo(() => getLanguageInfo(lang), [lang]);
  const t = useMemo(
    () => getTranslations(lang, serverConfig.translationOverrides),
    [lang, serverConfig.translationOverrides]
  );

  // Sync HTML lang, dir, and dark class
  useEffect(() => {
    const root = document.documentElement;
    root.lang = langInfo.code;
    root.dir = langInfo.dir;
    if (prefs.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [langInfo, prefs.theme]);

  const setLang = useCallback((code: string) => {
    const normalized = code.toLowerCase().split('-')[0];
    if (LANGUAGE_CODES.includes(normalized)) {
      setLangState(normalized);
      saveLanguagePreference(normalized);
    }
  }, []);

  const refreshServerConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = (await res.json()) as ServerPublicConfig;
        setServerConfig({
          ...DEFAULT_SERVER_CONFIG,
          ...data,
          settings: { ...DEFAULT_SERVER_CONFIG.settings, ...(data.settings || {}) },
        });
      }
    } catch {
      // Keep cached/default config when offline
    }
  }, []);

  useEffect(() => {
    refreshServerConfig();
  }, [refreshServerConfig]);

  const updatePrefs = useCallback((updater: (prev: UserPreferences) => UserPreferences) => {
    setPrefs((prev) => {
      const next = updater(prev);
      savePreferences(next);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(
    () => updatePrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' })),
    [updatePrefs]
  );
  const toggleSound = useCallback(
    () => updatePrefs((p) => ({ ...p, soundEnabled: !p.soundEnabled })),
    [updatePrefs]
  );
  const toggleHaptics = useCallback(
    () => updatePrefs((p) => ({ ...p, hapticsEnabled: !p.hapticsEnabled })),
    [updatePrefs]
  );
  const toggleAds = useCallback(
    () => updatePrefs((p) => ({ ...p, adsEnabled: !p.adsEnabled })),
    [updatePrefs]
  );

  const toggleFavorite = useCallback((slug: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(slug);
      const next = exists ? prev.filter((s) => s !== slug) : [slug, ...prev];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((slug: string) => favorites.includes(slug), [favorites]);

  const recordSessionStart = useCallback((slug: string) => {
    const now = Date.now();
    setRecentGames((prev) => {
      const next = [{ slug, lastPlayedAt: now }, ...prev.filter((i) => i.slug !== slug)].slice(0, 12);
      saveRecentGames(next);
      return next;
    });
    setStats((prev) => {
      const curr = prev[slug] || { plays: 0, bestScore: 0, totalSeconds: 0, wins: 0, lastPlayedAt: now };
      const next = {
        ...prev,
        [slug]: { ...curr, plays: curr.plays + 1, lastPlayedAt: now },
      };
      saveStats(next);
      return next;
    });
  }, []);

  const recordGameResult = useCallback(
    (slug: string, score: number, won: boolean, durationSec: number) => {
      const now = Date.now();
      setStats((prev) => {
        const curr = prev[slug] || { plays: 1, bestScore: 0, totalSeconds: 0, wins: 0, lastPlayedAt: now };
        const next = {
          ...prev,
          [slug]: {
            plays: curr.plays,
            bestScore: Math.max(curr.bestScore, Math.round(score)),
            totalSeconds: curr.totalSeconds + Math.max(0, Math.round(durationSec)),
            wins: curr.wins + (won ? 1 : 0),
            lastPlayedAt: now,
          },
        };
        saveStats(next);
        return next;
      });

      fetch('/api/analytics/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSlug: slug, lang, durationSec }),
      }).catch(() => {});
    },
    [lang]
  );

  const visibleGames = useMemo(() => {
    return GAMES_CATALOG.filter((g) => {
      const override = serverConfig.gameOverrides?.[g.slug];
      const catOverride = serverConfig.categoryOverrides?.[g.category];
      if (override && override.enabled === false) return false;
      if (catOverride && catOverride.enabled === false) return false;
      return true;
    }).map((g) => {
      const override = serverConfig.gameOverrides?.[g.slug];
      const localized = t.games[g.slug];
      return {
        ...g,
        title: override?.customTitle || localized?.title || g.title,
        shortDescription: override?.customDescription || localized?.shortDescription || g.shortDescription,
      };
    });
  }, [serverConfig, t]);

  const value: AppContextValue = {
    lang,
    langInfo,
    t,
    setLang,
    prefs,
    toggleTheme,
    toggleSound,
    toggleHaptics,
    toggleAds,
    favorites,
    toggleFavorite,
    isFavorite,
    recentGames,
    stats,
    recordSessionStart,
    recordGameResult,
    serverConfig,
    refreshServerConfig,
    visibleGames,
    adminToken,
    setAdminToken,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
