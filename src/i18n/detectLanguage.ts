import { LANGUAGE_CODES } from '../config/site';

const STORAGE_KEY = 'goo_lang';

export function getSavedLanguage(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGE_CODES.includes(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage access errors in restricted frames
  }
  return null;
}

export function saveLanguagePreference(lang: string): void {
  try {
    if (LANGUAGE_CODES.includes(lang)) {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  } catch {
    // Ignore storage write errors
  }
}

export function detectBrowserLanguage(): string {
  const saved = getSavedLanguage();
  if (saved) return saved;

  if (typeof navigator !== 'undefined') {
    const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

    for (const raw of candidates) {
      if (!raw) continue;
      const base = raw.toLowerCase().split('-')[0];
      if (LANGUAGE_CODES.includes(base)) {
        return base;
      }
    }
  }

  return 'en';
}
