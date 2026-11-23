import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { LANGUAGE_CODES, MONETAG_CONFIG, SITE_CONFIG } from './src/config/site.ts';
import { GAMES_CATALOG, GAME_CATEGORIES } from './src/data/games.ts';
import {
  buildLanguageSitemapXml,
  buildRouteSeo,
  buildSitemapIndexXml,
  injectSeoIntoHtml,
} from './src/seo/serverMeta.ts';

interface GameOverride {
  enabled: boolean;
  customTitle?: string;
  customDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface CategoryOverride {
  enabled: boolean;
  label?: string;
}

interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  mode: string;
  lang: string;
  createdAt: string;
}

interface AnalyticsEvent {
  gameSlug: string;
  lang: string;
  durationSec: number;
  timestamp: string;
}

interface ErrorLogEntry {
  id: string;
  message: string;
  source: string;
  path: string;
  timestamp: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  lang: string;
  timestamp: string;
}

interface StoreData {
  adminPasswordHash: string | null;
  settings: {
    siteName: string;
    tagline: string;
    adsEnabled: boolean;
    monetagDirectLink: string;
    adsDisclosure: string;
    maintenanceMode: boolean;
    analyticsEnabled: boolean;
  };
  gameOverrides: Record<string, GameOverride>;
  categoryOverrides: Record<string, CategoryOverride>;
  translationOverrides: Record<string, Record<string, string>>;
  analytics: {
    playsByGame: Record<string, number>;
    totalSessions: number;
    recentEvents: AnalyticsEvent[];
  };
  leaderboard: Record<string, LeaderboardEntry[]>;
  errorLogs: ErrorLogEntry[];
  contactMessages: ContactMessage[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

// Ephemeral in-memory fallback for signing session tokens when SESSION_SECRET is unset
const EPHEMERAL_SIGNING_KEY = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  return (process.env.SESSION_SECRET || '').trim() || EPHEMERAL_SIGNING_KEY;
}

function getEnvPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

function createDefaultStore(): StoreData {
  const gameOverrides: Record<string, GameOverride> = {};
  for (const g of GAMES_CATALOG) {
    gameOverrides[g.slug] = { enabled: true };
  }
  const categoryOverrides: Record<string, CategoryOverride> = {};
  for (const c of GAME_CATEGORIES) {
    categoryOverrides[c.id] = { enabled: true };
  }
  return {
    adminPasswordHash: null,
    settings: {
      siteName: SITE_CONFIG.brandName,
      tagline: SITE_CONFIG.tagline,
      adsEnabled: true,
      monetagDirectLink: MONETAG_CONFIG.directLink,
      adsDisclosure: MONETAG_CONFIG.disclosureLabel,
      maintenanceMode: false,
      analyticsEnabled: true,
    },
    gameOverrides,
    categoryOverrides,
    translationOverrides: {},
    analytics: {
      playsByGame: {},
      totalSessions: 0,
      recentEvents: [],
    },
    leaderboard: {},
    errorLogs: [],
    contactMessages: [],
  };
}

function readStore(): StoreData {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const initial = createDefaultStore();
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    const defaults = createDefaultStore();
    return {
      ...defaults,
      ...parsed,
      settings: { ...defaults.settings, ...(parsed.settings || {}) },
      gameOverrides: { ...defaults.gameOverrides, ...(parsed.gameOverrides || {}) },
      categoryOverrides: { ...defaults.categoryOverrides, ...(parsed.categoryOverrides || {}) },
      analytics: { ...defaults.analytics, ...(parsed.analytics || {}) },
    };
  } catch {
    return createDefaultStore();
  }
}

function writeStore(data: StoreData): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function timingSafeCompareString(a: string, b: string): boolean {
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

function issueAdminToken(): string {
  const payload = {
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 12 * 60 * 60 * 1000,
    jti: crypto.randomBytes(8).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSigningSecret()).update(encoded).digest('base64url');
  if (!timingSafeCompareString(sig, expectedSig)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { role?: string; exp?: number };
    return payload.role === 'admin' && typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Unauthorized. Valid admin Bearer token required.' });
    return;
  }
  next();
}

function getRequestOrigin(req: Request): string {
  const envUrl = (process.env.APP_URL || '').trim();
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function detectAcceptLanguage(req: Request): string {
  const header = req.headers['accept-language'];
  if (!header || typeof header !== 'string') return 'en';
  const candidates = header.split(',').map((item) => item.split(';')[0].trim().toLowerCase().split('-')[0]);
  for (const c of candidates) {
    if (LANGUAGE_CODES.includes(c)) return c;
  }
  return 'en';
}

function sanitizeText(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLen);
}

function isValidHttpUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.disable('x-powered-by');

  app.use(express.json({ limit: '256kb' }));

  // Baseline security headers (without blocking AI Studio iframe or Vite dev)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self';"
    );
    next();
  });

  // Robots.txt
  app.get('/robots.txt', (req, res) => {
    const origin = getRequestOrigin(req);
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /*/admin/\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`
    );
  });

  // Sitemap Index
  app.get('/sitemap.xml', (req, res) => {
    const origin = getRequestOrigin(req);
    res.type('application/xml').send(buildSitemapIndexXml(origin));
  });

  // Language-specific Sitemaps
  app.get('/sitemap-:lang.xml', (req, res) => {
    const lang = String(req.params.lang || '').toLowerCase();
    if (!LANGUAGE_CODES.includes(lang)) {
      res.status(404).type('text/plain').send('Not Found');
      return;
    }
    const origin = getRequestOrigin(req);
    res.type('application/xml').send(buildLanguageSitemapXml(origin, lang));
  });

  // Public runtime configuration
  app.get('/api/config', (_req, res) => {
    const store = readStore();
    res.json({
      settings: store.settings,
      gameOverrides: store.gameOverrides,
      categoryOverrides: store.categoryOverrides,
      translationOverrides: store.translationOverrides,
      playsByGame: store.analytics.playsByGame,
    });
  });

  // Real anonymous play analytics recording
  app.post('/api/analytics/play', (req, res) => {
    const store = readStore();
    if (!store.settings.analyticsEnabled) {
      res.json({ recorded: false });
      return;
    }
    const gameSlug = sanitizeText(req.body?.gameSlug, 40);
    const lang = sanitizeText(req.body?.lang, 10) || 'en';
    const durationSec = Math.max(0, Math.min(36000, Number(req.body?.durationSec) || 0));

    if (!GAMES_CATALOG.some((g) => g.slug === gameSlug)) {
      res.status(400).json({ error: 'Invalid game slug' });
      return;
    }

    store.analytics.playsByGame[gameSlug] = (store.analytics.playsByGame[gameSlug] || 0) + 1;
    store.analytics.totalSessions += 1;
    store.analytics.recentEvents.unshift({
      gameSlug,
      lang: LANGUAGE_CODES.includes(lang) ? lang : 'en',
      durationSec,
      timestamp: new Date().toISOString(),
    });
    store.analytics.recentEvents = store.analytics.recentEvents.slice(0, 200);
    writeStore(store);

    res.json({ recorded: true, plays: store.analytics.playsByGame[gameSlug] });
  });

  // Real community leaderboard (strictly player-submitted scores)
  app.get('/api/leaderboard', (req, res) => {
    const store = readStore();
    const slug = sanitizeText(req.query.game, 40);
    if (slug) {
      res.json({ game: slug, entries: store.leaderboard[slug] || [] });
      return;
    }
    res.json({ leaderboard: store.leaderboard });
  });

  app.post('/api/leaderboard', (req, res) => {
    const gameSlug = sanitizeText(req.body?.gameSlug, 40);
    const playerName = sanitizeText(req.body?.playerName, 24) || 'Guest Player';
    const mode = sanitizeText(req.body?.mode, 24) || 'Standard';
    const lang = sanitizeText(req.body?.lang, 10) || 'en';
    const score = Number(req.body?.score);

    if (!GAMES_CATALOG.some((g) => g.slug === gameSlug)) {
      res.status(400).json({ error: 'Invalid game slug' });
      return;
    }
    if (!Number.isFinite(score) || score < 0 || score > 10000000) {
      res.status(400).json({ error: 'Invalid score value' });
      return;
    }

    const store = readStore();
    const list = store.leaderboard[gameSlug] || [];
    const entry: LeaderboardEntry = {
      id: crypto.randomBytes(6).toString('hex'),
      playerName,
      score: Math.round(score),
      mode,
      lang: LANGUAGE_CODES.includes(lang) ? lang : 'en',
      createdAt: new Date().toISOString(),
    };
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    store.leaderboard[gameSlug] = list.slice(0, 20);
    writeStore(store);

    res.json({ saved: true, entry, entries: store.leaderboard[gameSlug] });
  });

  // Contact form persistence
  app.post('/api/contact', (req, res) => {
    const name = sanitizeText(req.body?.name, 80);
    const email = sanitizeText(req.body?.email, 120);
    const message = sanitizeText(req.body?.message, 2000);
    const lang = sanitizeText(req.body?.lang, 10) || 'en';

    if (!name || !message || !email.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid name, email, and message.' });
      return;
    }

    const store = readStore();
    store.contactMessages.unshift({
      id: crypto.randomBytes(6).toString('hex'),
      name,
      email,
      message,
      lang,
      timestamp: new Date().toISOString(),
    });
    store.contactMessages = store.contactMessages.slice(0, 100);
    writeStore(store);
    res.json({ received: true });
  });

  // Client runtime error reporter
  app.post('/api/errors', (req, res) => {
    const message = sanitizeText(req.body?.message, 400);
    const source = sanitizeText(req.body?.source, 120);
    const reqPath = sanitizeText(req.body?.path, 200);
    if (!message) {
      res.status(400).json({ error: 'Message required' });
      return;
    }
    const store = readStore();
    store.errorLogs.unshift({
      id: crypto.randomBytes(6).toString('hex'),
      message,
      source: source || 'client',
      path: reqPath || '/',
      timestamp: new Date().toISOString(),
    });
    store.errorLogs = store.errorLogs.slice(0, 100);
    writeStore(store);
    res.json({ logged: true });
  });

  // Admin auth status
  app.get('/api/admin/status', (req, res) => {
    const store = readStore();
    const hasPasscodeEnv = getEnvPasscode().length > 0;
    const isBootstrapped = Boolean(store.adminPasswordHash);
    const authenticated = verifyAdminToken(extractBearerToken(req));
    res.json({ hasPasscodeEnv, isBootstrapped, authenticated });
  });

  // First-run admin password claim when ADMIN_PASSCODE env is unset
  app.post('/api/admin/bootstrap', (req, res) => {
    if (getEnvPasscode().length > 0) {
      res.status(403).json({ error: 'ADMIN_PASSCODE environment variable is already configured.' });
      return;
    }
    const store = readStore();
    if (store.adminPasswordHash) {
      res.status(409).json({ error: 'Admin password has already been claimed.' });
      return;
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      return;
    }
    store.adminPasswordHash = hashPassword(password);
    writeStore(store);
    res.json({ token: issueAdminToken() });
  });

  // Admin login
  app.post('/api/admin/login', (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!password) {
      res.status(400).json({ error: 'Passcode is required.' });
      return;
    }
    const envPasscode = getEnvPasscode();
    const store = readStore();

    if (envPasscode.length > 0) {
      if (!timingSafeCompareString(password, envPasscode)) {
        res.status(401).json({ error: 'Invalid admin passcode.' });
        return;
      }
      res.json({ token: issueAdminToken() });
      return;
    }

    if (!store.adminPasswordHash) {
      res.status(400).json({ error: 'Admin password not initialized yet.' });
      return;
    }

    if (!verifyPasswordHash(password, store.adminPasswordHash)) {
      res.status(401).json({ error: 'Invalid admin passcode.' });
      return;
    }

    res.json({ token: issueAdminToken() });
  });

  // Protected Admin data endpoints
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const store = readStore();
    res.json({
      settings: store.settings,
      gameOverrides: store.gameOverrides,
      categoryOverrides: store.categoryOverrides,
      translationOverrides: store.translationOverrides,
      analytics: store.analytics,
      errorLogs: store.errorLogs,
      contactMessages: store.contactMessages,
    });
  });

  app.post('/api/admin/settings', requireAdmin, (req, res) => {
    const store = readStore();
    const body = req.body || {};
    const nextDirectLink = sanitizeText(body.monetagDirectLink, 300);
    if (nextDirectLink && !isValidHttpUrl(nextDirectLink)) {
      res.status(400).json({ error: 'Monetag Direct Link must be a valid http(s) URL.' });
      return;
    }
    store.settings = {
      siteName: sanitizeText(body.siteName, 60) || store.settings.siteName,
      tagline: sanitizeText(body.tagline, 140) || store.settings.tagline,
      adsEnabled: typeof body.adsEnabled === 'boolean' ? body.adsEnabled : store.settings.adsEnabled,
      monetagDirectLink: nextDirectLink || store.settings.monetagDirectLink,
      adsDisclosure: sanitizeText(body.adsDisclosure, 80) || store.settings.adsDisclosure,
      maintenanceMode: typeof body.maintenanceMode === 'boolean' ? body.maintenanceMode : store.settings.maintenanceMode,
      analyticsEnabled: typeof body.analyticsEnabled === 'boolean' ? body.analyticsEnabled : store.settings.analyticsEnabled,
    };
    writeStore(store);
    res.json({ settings: store.settings });
  });

  app.post('/api/admin/games', requireAdmin, (req, res) => {
    const slug = sanitizeText(req.body?.slug, 40);
    if (!GAMES_CATALOG.some((g) => g.slug === slug)) {
      res.status(400).json({ error: 'Unknown game slug' });
      return;
    }
    const store = readStore();
    store.gameOverrides[slug] = {
      enabled: typeof req.body?.enabled === 'boolean' ? req.body.enabled : true,
      customTitle: sanitizeText(req.body?.customTitle, 80) || undefined,
      customDescription: sanitizeText(req.body?.customDescription, 280) || undefined,
      seoTitle: sanitizeText(req.body?.seoTitle, 120) || undefined,
      seoDescription: sanitizeText(req.body?.seoDescription, 220) || undefined,
    };
    writeStore(store);
    res.json({ gameOverrides: store.gameOverrides });
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const id = sanitizeText(req.body?.id, 30);
    if (!GAME_CATEGORIES.some((c) => c.id === id)) {
      res.status(400).json({ error: 'Unknown category ID' });
      return;
    }
    const store = readStore();
    store.categoryOverrides[id] = {
      enabled: typeof req.body?.enabled === 'boolean' ? req.body.enabled : true,
      label: sanitizeText(req.body?.label, 40) || undefined,
    };
    writeStore(store);
    res.json({ categoryOverrides: store.categoryOverrides });
  });

  app.post('/api/admin/translations', requireAdmin, (req, res) => {
    const lang = sanitizeText(req.body?.lang, 10);
    const key = sanitizeText(req.body?.key, 80);
    const value = sanitizeText(req.body?.value, 400);
    if (!LANGUAGE_CODES.includes(lang) || !key) {
      res.status(400).json({ error: 'Valid language code and key required.' });
      return;
    }
    const store = readStore();
    if (!store.translationOverrides[lang]) {
      store.translationOverrides[lang] = {};
    }
    if (value) {
      store.translationOverrides[lang][key] = value;
    } else {
      delete store.translationOverrides[lang][key];
    }
    writeStore(store);
    res.json({ translationOverrides: store.translationOverrides });
  });

  app.delete('/api/admin/errors', requireAdmin, (_req, res) => {
    const store = readStore();
    store.errorLogs = [];
    writeStore(store);
    res.json({ cleared: true });
  });

  // Unmatched API routes must return JSON 404
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Clean root redirect to browser preferred language
  app.get('/', (req, res) => {
    const detected = detectAcceptLanguage(req);
    res.redirect(302, `/${detected}/`);
  });

  // Redirect bare /admin to /en/admin/
  app.get('/admin', (_req, res) => {
    res.redirect(302, '/en/admin/');
  });

  // Vite dev middleware or production static assets
  let vite: Awaited<ReturnType<typeof import('vite')['createServer']>> | null = null;
  const distDir = path.resolve(process.cwd(), 'dist');

  if (!IS_PROD) {
    const { createServer } = await import('vite');
    vite = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir, { index: false, maxAge: '7d' }));
  }

  // SSR SEO HTML handler for all routes
  app.get('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const origin = getRequestOrigin(req);
      const store = readStore();

      let templateHtml: string;
      if (!IS_PROD && vite) {
        templateHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
        templateHtml = await vite.transformIndexHtml(url, templateHtml);
      } else {
        templateHtml = fs.readFileSync(path.resolve(distDir, 'index.html'), 'utf8');
      }

      const seo = buildRouteSeo(url, origin, store.gameOverrides, store.translationOverrides);
      const finalHtml = injectSeoIntoHtml(templateHtml, seo);
      res.status(seo.isNotFound ? 404 : 200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(finalHtml);
    } catch (err) {
      next(err);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GOO GAME PLAY server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
