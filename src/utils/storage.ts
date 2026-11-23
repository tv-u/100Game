export interface GameLocalStat {
  plays: number;
  bestScore: number;
  totalSeconds: number;
  wins: number;
  lastPlayedAt: number;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  adsEnabled: boolean;
}

export interface RecentGameItem {
  slug: string;
  lastPlayedAt: number;
}

const KEYS = {
  PREFS: 'goo_prefs_v1',
  FAVORITES: 'goo_favorites_v1',
  RECENT: 'goo_recent_v1',
  STATS: 'goo_stats_v1',
};

const DEFAULT_PREFS: UserPreferences = {
  theme: 'dark',
  soundEnabled: true,
  hapticsEnabled: true,
  adsEnabled: true,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/storage errors
  }
}

export function loadPreferences(): UserPreferences {
  return { ...DEFAULT_PREFS, ...readJson<Partial<UserPreferences>>(KEYS.PREFS, {}) };
}

export function savePreferences(prefs: UserPreferences): void {
  writeJson(KEYS.PREFS, prefs);
}

export function loadFavorites(): string[] {
  const list = readJson<unknown>(KEYS.FAVORITES, []);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

export function saveFavorites(slugs: string[]): void {
  writeJson(KEYS.FAVORITES, slugs);
}

export function loadRecentGames(): RecentGameItem[] {
  const list = readJson<unknown>(KEYS.RECENT, []);
  return Array.isArray(list)
    ? list.filter(
        (x): x is RecentGameItem =>
          Boolean(x) && typeof (x as RecentGameItem).slug === 'string' && typeof (x as RecentGameItem).lastPlayedAt === 'number'
      )
    : [];
}

export function saveRecentGames(items: RecentGameItem[]): void {
  writeJson(KEYS.RECENT, items.slice(0, 12));
}

export function loadStats(): Record<string, GameLocalStat> {
  return readJson<Record<string, GameLocalStat>>(KEYS.STATS, {});
}

export function saveStats(stats: Record<string, GameLocalStat>): void {
  writeJson(KEYS.STATS, stats);
}
