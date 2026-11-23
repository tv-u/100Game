import { GAMES_CATALOG, GAME_CATEGORIES, getGameBySlug } from '../data/games.ts';
import { LANGUAGE_CODES, SITE_CONFIG, SUPPORTED_LANGUAGES, getLanguageInfo } from '../config/site.ts';
import { getTranslations } from '../i18n/index.ts';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RouteSeoData {
  title: string;
  description: string;
  canonicalUrl: string;
  lang: string;
  dir: 'ltr' | 'rtl';
  headTags: string;
  isNotFound: boolean;
}

const STATIC_PAGE_PATHS = [
  '',
  'games/',
  'popular/',
  'new/',
  'trending/',
  'categories/',
  'instructions/',
  'favorites/',
  'recent/',
  'stats/',
  'leaderboard/',
  'about/',
  'contact/',
  'privacy-policy/',
  'terms/',
  'cookie-policy/',
  'disclaimer/',
  'faq/',
  'sitemap/',
];

export function getAllLocalizedSubpaths(): string[] {
  return [
    ...STATIC_PAGE_PATHS,
    ...GAMES_CATALOG.map((g) => `games/${g.slug}/`),
  ];
}

export function buildRouteSeo(
  rawPath: string,
  origin: string,
  gameOverrides?: Record<string, { seoTitle?: string; seoDescription?: string; customTitle?: string; customDescription?: string }>,
  translationOverrides?: Record<string, Record<string, string>>
): RouteSeoData {
  const cleanPath = rawPath.split('?')[0];
  const segments = cleanPath.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

  const maybeLang = segments[0]?.toLowerCase();
  const isKnownLang = maybeLang ? LANGUAGE_CODES.includes(maybeLang) : false;
  const lang = isKnownLang ? maybeLang : 'en';
  const langInfo = getLanguageInfo(lang);
  const t = getTranslations(lang, translationOverrides);

  const subSegments = isKnownLang ? segments.slice(1) : segments;
  const subPath = subSegments.join('/');
  const normalizedSub = subPath ? `${subPath}/` : '';

  let title = `${SITE_CONFIG.brandName} – ${t.hero.tagline}`;
  let description = t.hero.subheadline;
  let isNotFound = false;
  const schemas: unknown[] = [];

  const baseUrl = origin.replace(/\/+$/, '');
  const canonicalPath = `/${lang}/${normalizedSub}`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

  // Organization & WebSite schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.brandName,
    url: `${baseUrl}/${lang}/`,
    logo: `${baseUrl}/pwa-512x512.png`,
  });

  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.brandName,
    url: `${baseUrl}/${lang}/`,
    inLanguage: langInfo.hreflang,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/${lang}/games/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  });

  const breadcrumbs: Array<{ name: string; item: string }> = [
    { name: t.nav.home, item: `${baseUrl}/${lang}/` },
  ];

  if (subSegments.length === 0) {
    title = `${SITE_CONFIG.brandName} – ${t.hero.tagline}`;
    description = t.hero.subheadline;
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_CONFIG.brandName,
      applicationCategory: 'GameApplication',
      operatingSystem: 'All',
      description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    });
  } else if (subSegments[0] === 'games' && subSegments.length === 1) {
    title = `${t.nav.games} | ${SITE_CONFIG.brandName}`;
    description = `Browse and play all 100 free HTML5 mini games online in ${langInfo.englishName} on mobile and desktop.`;
    breadcrumbs.push({ name: t.nav.games, item: canonicalUrl });
  } else if (subSegments[0] === 'games' && subSegments.length === 2) {
    const game = getGameBySlug(subSegments[1]);
    if (game) {
      const override = gameOverrides?.[game.slug];
      const localizedGame = t.games[game.slug];
      const gameTitle = override?.customTitle || localizedGame?.title || game.title;
      title = override?.seoTitle || game.seoTitle;
      description = override?.seoDescription || override?.customDescription || localizedGame?.shortDescription || game.seoDescription;
      breadcrumbs.push({ name: t.nav.games, item: `${baseUrl}/${lang}/games/` });
      breadcrumbs.push({ name: gameTitle, item: canonicalUrl });

      const multiplayerSlugs = new Set([
        'tic-tac-toe', 'chess', 'checkers', 'ludo', 'connect-four', 'reversi',
        'dots-and-boxes', 'mancala', 'chinese-checkers', 'air-hockey',
        'tic-tac-toe-ultimate', 'rock-paper-scissors', 'pool-billiards',
      ]);

      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        name: gameTitle,
        description,
        genre: game.category,
        gamePlatform: ['Web Browser', 'Mobile Web', 'Desktop Web'],
        applicationCategory: 'Game',
        operatingSystem: 'Android, iOS, Windows, macOS, Linux',
        playMode: multiplayerSlugs.has(game.slug) ? ['SinglePlayer', 'MultiPlayer'] : 'SinglePlayer',
        url: canonicalUrl,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      });
    } else {
      isNotFound = true;
    }
  } else if (subSegments[0] === 'popular' && subSegments.length === 1) {
    title = `${t.nav.popular} | ${SITE_CONFIG.brandName}`;
    description = t.sections.popularTitle;
    breadcrumbs.push({ name: t.nav.popular, item: canonicalUrl });
  } else if (subSegments[0] === 'new' && subSegments.length === 1) {
    title = `${t.nav.newGames} | ${SITE_CONFIG.brandName}`;
    description = t.sections.newTitle;
    breadcrumbs.push({ name: t.nav.newGames, item: canonicalUrl });
  } else if (subSegments[0] === 'trending' && subSegments.length === 1) {
    title = `${t.nav.trending} | ${SITE_CONFIG.brandName}`;
    description = t.sections.trendingTitle;
    breadcrumbs.push({ name: t.nav.trending, item: canonicalUrl });
  } else if (subSegments[0] === 'categories' && subSegments.length <= 2) {
    const cat = subSegments[1] ? GAME_CATEGORIES.find((c) => c.id === subSegments[1]) : undefined;
    if (subSegments[1] && !cat) {
      isNotFound = true;
    } else {
      title = cat ? `${cat.name} | ${SITE_CONFIG.brandName}` : `${t.nav.categories} | ${SITE_CONFIG.brandName}`;
      description = cat ? cat.description : t.sections.categoriesTitle;
      breadcrumbs.push({ name: t.nav.categories, item: `${baseUrl}/${lang}/categories/` });
      if (cat) breadcrumbs.push({ name: cat.name, item: canonicalUrl });
    }
  } else if (subSegments[0] === 'instructions' && subSegments.length === 1) {
    title = `${t.nav.instructions} | ${SITE_CONFIG.brandName}`;
    description = 'Complete desktop keyboard and mobile touch control instructions for all 100 games.';
    breadcrumbs.push({ name: t.nav.instructions, item: canonicalUrl });
  } else if (subSegments[0] === 'favorites' && subSegments.length === 1) {
    title = `${t.nav.favorites} | ${SITE_CONFIG.brandName}`;
    description = 'Quick access to your saved favorite browser games.';
    breadcrumbs.push({ name: t.nav.favorites, item: canonicalUrl });
  } else if (subSegments[0] === 'recent' && subSegments.length === 1) {
    title = `${t.nav.recent} | ${SITE_CONFIG.brandName}`;
    description = 'Resume your recently played HTML5 mini games.';
    breadcrumbs.push({ name: t.nav.recent, item: canonicalUrl });
  } else if (subSegments[0] === 'stats' && subSegments.length === 1) {
    title = `${t.nav.stats} | ${SITE_CONFIG.brandName}`;
    description = 'View your anonymous local high scores, sessions played, and game statistics.';
    breadcrumbs.push({ name: t.nav.stats, item: canonicalUrl });
  } else if (subSegments[0] === 'leaderboard' && subSegments.length === 1) {
    title = `${t.nav.leaderboard} | ${SITE_CONFIG.brandName}`;
    description = 'Verified player-submitted high scores recorded on GOO GAME PLAY.';
    breadcrumbs.push({ name: t.nav.leaderboard, item: canonicalUrl });
  } else if (subSegments[0] === 'about' && subSegments.length === 1) {
    title = `${t.legal.aboutTitle} | ${SITE_CONFIG.brandName}`;
    description = 'Learn how GOO GAME PLAY delivers fast, install-free HTML5 games worldwide.';
    breadcrumbs.push({ name: t.legal.aboutTitle, item: canonicalUrl });
  } else if (subSegments[0] === 'contact' && subSegments.length === 1) {
    title = `${t.legal.contactTitle} | ${SITE_CONFIG.brandName}`;
    description = 'Reach out to the GOO GAME PLAY team for feedback, bug reports, or inquiries.';
    breadcrumbs.push({ name: t.legal.contactTitle, item: canonicalUrl });
  } else if (subSegments[0] === 'privacy-policy' && subSegments.length === 1) {
    title = `${t.legal.privacyTitle} | ${SITE_CONFIG.brandName}`;
    description = 'Privacy Policy for GOO GAME PLAY anonymous browser gaming.';
    breadcrumbs.push({ name: t.legal.privacyTitle, item: canonicalUrl });
  } else if (subSegments[0] === 'terms' && subSegments.length === 1) {
    title = `${t.legal.termsTitle} | ${SITE_CONFIG.brandName}`;
    description = 'Terms and Conditions for playing free HTML5 games on GOO GAME PLAY.';
    breadcrumbs.push({ name: t.legal.termsTitle, item: canonicalUrl });
  } else if (subSegments[0] === 'cookie-policy' && subSegments.length === 1) {
    title = `${t.legal.cookiesTitle} | ${SITE_CONFIG.brandName}`;
    description = 'Cookie and local browser storage disclosure for GOO GAME PLAY.';
    breadcrumbs.push({ name: t.legal.cookiesTitle, item: canonicalUrl });
  } else if (subSegments[0] === 'disclaimer' && subSegments.length === 1) {
    title = `${t.legal.disclaimerTitle} | ${SITE_CONFIG.brandName}`;
    description = 'Platform and sponsored advertising disclaimer for GOO GAME PLAY.';
    breadcrumbs.push({ name: t.legal.disclaimerTitle, item: canonicalUrl });
  } else if (subSegments[0] === 'faq' && subSegments.length === 1) {
    title = `${t.legal.faqTitle} | ${SITE_CONFIG.brandName}`;
    description = 'Answers about offline PWA play, controls, privacy, and supported devices.';
    breadcrumbs.push({ name: t.legal.faqTitle, item: canonicalUrl });
  } else if (subSegments[0] === 'sitemap' && subSegments.length === 1) {
    title = `${t.legal.sitemapTitle} | ${SITE_CONFIG.brandName}`;
    description = 'Complete directory of all games, categories, languages, and pages on GOO GAME PLAY.';
    breadcrumbs.push({ name: t.legal.sitemapTitle, item: canonicalUrl });
  } else if (subSegments[0] === 'admin') {
    title = `Admin Console | ${SITE_CONFIG.brandName}`;
    description = 'Protected administration dashboard.';
  } else {
    isNotFound = true;
    title = `404 Page Not Found | ${SITE_CONFIG.brandName}`;
    description = 'The requested page could not be found on GOO GAME PLAY.';
  }

  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((b, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: b.name,
      item: b.item,
    })),
  });

  const hreflangTags = isNotFound || subSegments[0] === 'admin'
    ? ''
    : [
        ...SUPPORTED_LANGUAGES.map(
          (l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${escapeHtml(`${baseUrl}/${l.code}/${normalizedSub}`)}" />`
        ),
        `<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${baseUrl}/en/${normalizedSub}`)}" />`,
      ].join('\n    ');

  const ogImage = `${baseUrl}/src/assets/images/arcade_hero_banner_1795426212632.jpg`;
  const robotsTag = subSegments[0] === 'admin' || isNotFound
    ? '<meta name="robots" content="noindex, nofollow" />'
    : '<meta name="robots" content="index, follow" />';

  const headTags = [
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    robotsTag,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:locale" content="${escapeHtml(langInfo.hreflang)}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
    hreflangTags,
    `<script type="application/ld+json">${JSON.stringify(schemas).replace(/</g, '\\u003c')}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ');

  return {
    title,
    description,
    canonicalUrl,
    lang,
    dir: langInfo.dir,
    headTags,
    isNotFound,
  };
}

export function injectSeoIntoHtml(html: string, seo: RouteSeoData): string {
  let out = html;
  out = out.replace(/<html lang="[^"]*"([^>]*)>/, `<html lang="${seo.lang}" dir="${seo.dir}"$1>`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
  out = out.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`
  );
  out = out.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`
  );
  out = out.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`
  );
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`
  );
  out = out.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`
  );
  out = out.replace('<!--SEO_META_OUTLET-->', seo.headTags);
  return out;
}

export function buildSitemapIndexXml(origin: string): string {
  const baseUrl = origin.replace(/\/+$/, '');
  const now = new Date().toISOString().split('T')[0];
  const entries = SUPPORTED_LANGUAGES.map(
    (l) => `  <sitemap>\n    <loc>${escapeHtml(`${baseUrl}/sitemap-${l.code}.xml`)}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`;
}

export function buildLanguageSitemapXml(origin: string, lang: string): string {
  const baseUrl = origin.replace(/\/+$/, '');
  const now = new Date().toISOString().split('T')[0];
  const subpaths = getAllLocalizedSubpaths();
  const urls = subpaths
    .map((sub) => {
      const loc = `${baseUrl}/${lang}/${sub}`;
      const alternates = SUPPORTED_LANGUAGES.map(
        (alt) => `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeHtml(`${baseUrl}/${alt.code}/${sub}`)}" />`
      ).join('\n');
      const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(`${baseUrl}/en/${sub}`)}" />`;
      return `  <url>\n    <loc>${escapeHtml(loc)}</loc>\n    <lastmod>${now}</lastmod>\n${alternates}\n${xDefault}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}
