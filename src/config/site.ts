export interface LanguageInfo {
  code: string;
  nativeName: string;
  englishName: string;
  dir: 'ltr' | 'rtl';
  hreflang: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr', hreflang: 'en' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', hreflang: 'hi' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr', hreflang: 'es' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', dir: 'ltr', hreflang: 'pt' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', dir: 'ltr', hreflang: 'fr' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', dir: 'ltr', hreflang: 'de' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', hreflang: 'ar' },
  { code: 'zh', nativeName: '简体中文', englishName: 'Chinese Simplified', dir: 'ltr', hreflang: 'zh-Hans' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', dir: 'ltr', hreflang: 'ja' },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', dir: 'ltr', hreflang: 'ko' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', dir: 'ltr', hreflang: 'ru' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', dir: 'ltr', hreflang: 'id' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', dir: 'ltr', hreflang: 'bn' },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', dir: 'rtl', hreflang: 'ur' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', dir: 'ltr', hreflang: 'tr' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', dir: 'ltr', hreflang: 'it' },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', dir: 'ltr', hreflang: 'vi' },
  { code: 'th', nativeName: 'ภาษาไทย', englishName: 'Thai', dir: 'ltr', hreflang: 'th' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', dir: 'ltr', hreflang: 'pa' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', dir: 'ltr', hreflang: 'mr' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', dir: 'ltr', hreflang: 'ta' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', dir: 'ltr', hreflang: 'te' },
];

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

export function getLanguageInfo(code: string | undefined): LanguageInfo {
  const normalized = (code || 'en').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.find((l) => l.code === normalized) || SUPPORTED_LANGUAGES[0];
}

export const MONETAG_CONFIG = {
  directLink: 'https://uplcm.com/4/12282219',
  providerName: 'Monetag',
  disclosureLabel: 'Sponsored Partner Link',
};

export const SITE_CONFIG = {
  brandName: 'GOO GAME PLAY',
  shortName: 'GOO PLAY',
  tagline: 'Play Instantly. Anywhere. Anytime.',
  contactEmail: 'support@googameplay.com',
  primaryKeywords: [
    'Free online games',
    'Play games online',
    'Browser games',
    'Mini games online',
    'HTML5 games',
    'Mobile browser games',
    'Free arcade games',
    'No download games',
    'Puzzle games online',
    'Casual games online',
  ],
};
