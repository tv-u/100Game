import React, { useCallback, useEffect, useState } from 'react';
import { Lock, LogOut, ShieldAlert, Trash2 } from 'lucide-react';
import { GAMES_CATALOG, GAME_CATEGORIES } from '../data/games';
import { SUPPORTED_LANGUAGES } from '../config/site';
import { useApp } from '../context/AppContext';
import { SeoHeadSync } from '../components/SeoHeadSync';

interface AdminStatus {
  hasPasscodeEnv: boolean;
  isBootstrapped: boolean;
  authenticated: boolean;
}

interface AdminOverview {
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
    { enabled: boolean; customTitle?: string; customDescription?: string; seoTitle?: string; seoDescription?: string }
  >;
  categoryOverrides: Record<string, { enabled: boolean; label?: string }>;
  translationOverrides: Record<string, Record<string, string>>;
  analytics: {
    playsByGame: Record<string, number>;
    totalSessions: number;
    recentEvents: Array<{ gameSlug: string; lang: string; durationSec: number; timestamp: string }>;
  };
  errorLogs: Array<{ id: string; message: string; source: string; path: string; timestamp: string }>;
  contactMessages: Array<{ id: string; name: string; email: string; message: string; lang: string; timestamp: string }>;
}

export const AdminPage: React.FC = () => {
  const { adminToken, setAdminToken, refreshServerConfig } = useApp();
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [tab, setTab] = useState<'analytics' | 'games' | 'settings' | 'translations' | 'logs'>('analytics');
  const [saveNotice, setSaveNotice] = useState('');

  // Editable states
  const [selectedGame, setSelectedGame] = useState(GAMES_CATALOG[0].slug);
  const [gameSearch, setGameSearch] = useState('');
  const [transLang, setTransLang] = useState('en');
  const [transKey, setTransKey] = useState('hero.headline');
  const [transValue, setTransValue] = useState('');

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/admin/status', {
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
    });
    if (res.ok) {
      setStatus(await res.json());
    }
  }, [adminToken]);

  const fetchOverview = useCallback(async () => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      setOverview(await res.json());
    } else if (res.status === 401) {
      setAdminToken(null);
    }
  }, [adminToken, setAdminToken]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (adminToken) fetchOverview();
  }, [adminToken, fetchOverview]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const isSetup = status && !status.hasPasscodeEnv && !status.isBootstrapped;
    const endpoint = isSetup ? '/api/admin/bootstrap' : '/api/admin/login';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || 'Authentication failed.');
      return;
    }
    setPassword('');
    setAdminToken(data.token);
  };

  const notify = (msg: string) => {
    setSaveNotice(msg);
    setTimeout(() => setSaveNotice(''), 2500);
  };

  const saveSettings = async (nextSettings: AdminOverview['settings']) => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(nextSettings),
    });
    if (res.ok) {
      await fetchOverview();
      await refreshServerConfig();
      notify('Settings saved.');
    }
  };

  const saveGameOverride = async (
    slug: string,
    payload: { enabled: boolean; customTitle?: string; customDescription?: string; seoTitle?: string; seoDescription?: string }
  ) => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ slug, ...payload }),
    });
    if (res.ok) {
      await fetchOverview();
      await refreshServerConfig();
      notify(`Updated ${slug}.`);
    }
  };

  const saveCategoryToggle = async (id: string, enabled: boolean) => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ id, enabled }),
    });
    if (res.ok) {
      await fetchOverview();
      await refreshServerConfig();
      notify(`Updated category ${id}.`);
    }
  };

  const saveTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    const res = await fetch('/api/admin/translations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ lang: transLang, key: transKey, value: transValue }),
    });
    if (res.ok) {
      await fetchOverview();
      await refreshServerConfig();
      notify('Translation override saved.');
    }
  };

  const clearErrorLogs = async () => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/errors', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      await fetchOverview();
      notify('Error logs cleared.');
    }
  };

  if (!adminToken) {
    const needsBootstrap = status && !status.hasPasscodeEnv && !status.isBootstrapped;
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <SeoHeadSync title="Admin Sign In | GOO GAME PLAY" description="Protected administration console." />
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/15 text-violet-500 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                {needsBootstrap ? 'Claim Admin Password' : 'Admin Sign In'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {needsBootstrap
                  ? 'First-run setup: choose an admin password (min 8 characters).'
                  : 'Enter your server-verified admin passcode.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <input
              type="password"
              required
              minLength={needsBootstrap ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={needsBootstrap ? 'Create password (8+ chars)' : 'Admin passcode'}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
            />
            {authError && <p className="text-xs text-rose-500 font-medium">{authError}</p>}
            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
            >
              {needsBootstrap ? 'Set Admin Password & Enter' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!overview) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-slate-500">Loading admin console...</div>;
  }

  const gameItem = GAMES_CATALOG.find((g) => g.slug === selectedGame)!;
  const gameOverride = overview.gameOverrides[selectedGame] || { enabled: true };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SeoHeadSync title="Admin Console | GOO GAME PLAY" description="Manage games, SEO, translations, and Monetag settings." />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">Admin Console</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Session verified · Real server-stored metrics & overrides
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveNotice && <span className="text-xs font-semibold text-emerald-500">{saveNotice}</span>}
          <button
            type="button"
            onClick={() => setAdminToken(null)}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Console Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'analytics', label: 'Real Analytics' },
          { id: 'games', label: 'Games & SEO' },
          { id: 'settings', label: 'Monetag & Site' },
          { id: 'translations', label: 'Categories & Translations' },
          { id: 'logs', label: `Messages & Errors (${overview.errorLogs.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as typeof tab)}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              tab === item.id
                ? 'bg-violet-600 text-white'
                : 'bg-white dark:bg-[#111524] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5">
              <div className="text-xs text-slate-500">Total Recorded Game Sessions</div>
              <div className="font-mono text-3xl font-bold tabular-nums mt-1">{overview.analytics.totalSessions}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5">
              <div className="text-xs text-slate-500">Active Games Enabled</div>
              <div className="font-mono text-3xl font-bold tabular-nums mt-1">
                {GAMES_CATALOG.filter((g) => overview.gameOverrides[g.slug]?.enabled !== false).length} / 100
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5">
              <div className="text-xs text-slate-500">Contact Inquiries</div>
              <div className="font-mono text-3xl font-bold tabular-nums mt-1">{overview.contactMessages.length}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5 space-y-3">
            <h2 className="font-display text-lg font-bold">Real Play Counts by Game</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {GAMES_CATALOG.map((g) => (
                <div key={g.slug} className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
                  <div className="text-xs text-slate-500 truncate">{g.title}</div>
                  <div className="font-mono text-xl font-bold tabular-nums mt-1">
                    {overview.analytics.playsByGame[g.slug] || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'games' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-2">
            <input
              type="search"
              value={gameSearch}
              onChange={(e) => setGameSearch(e.target.value)}
              placeholder="Filter 100 games..."
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0D132B] text-xs"
            />
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {GAMES_CATALOG.filter(
                (g) => !gameSearch.trim() || g.title.toLowerCase().includes(gameSearch.toLowerCase())
              ).map((g) => {
                const enabled = overview.gameOverrides[g.slug]?.enabled !== false;
                return (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => setSelectedGame(g.slug)}
                    className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold border ${
                      selectedGame === g.slug
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white dark:bg-[#111524] border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <span className="truncate">#{String(g.number).padStart(2, '0')} {g.title}</span>
                    <span className="text-[11px] font-mono shrink-0 ml-2">{enabled ? 'ON' : 'OFF'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form
            key={selectedGame}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              saveGameOverride(selectedGame, {
                enabled: fd.get('enabled') === 'on',
                customTitle: String(fd.get('customTitle') || ''),
                customDescription: String(fd.get('customDescription') || ''),
                seoTitle: String(fd.get('seoTitle') || ''),
                seoDescription: String(fd.get('seoDescription') || ''),
              });
            }}
            className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Edit {gameItem.title}</h2>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input name="enabled" type="checkbox" defaultChecked={gameOverride.enabled !== false} />
                <span>Game Enabled</span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Custom Title</label>
              <input
                name="customTitle"
                defaultValue={gameOverride.customTitle || ''}
                placeholder={gameItem.title}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Custom Description</label>
              <textarea
                name="customDescription"
                rows={2}
                defaultValue={gameOverride.customDescription || ''}
                placeholder={gameItem.shortDescription}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">SEO Title</label>
              <input
                name="seoTitle"
                defaultValue={gameOverride.seoTitle || ''}
                placeholder={gameItem.seoTitle}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">SEO Meta Description</label>
              <textarea
                name="seoDescription"
                rows={2}
                defaultValue={gameOverride.seoDescription || ''}
                placeholder={gameItem.seoDescription}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
            >
              Save Game & SEO Changes
            </button>
          </form>
        </div>
      )}

      {tab === 'settings' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            saveSettings({
              siteName: String(fd.get('siteName') || overview.settings.siteName),
              tagline: String(fd.get('tagline') || overview.settings.tagline),
              adsEnabled: fd.get('adsEnabled') === 'on',
              monetagDirectLink: String(fd.get('monetagDirectLink') || overview.settings.monetagDirectLink),
              adsDisclosure: String(fd.get('adsDisclosure') || overview.settings.adsDisclosure),
              maintenanceMode: fd.get('maintenanceMode') === 'on',
              analyticsEnabled: fd.get('analyticsEnabled') === 'on',
            });
          }}
          className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6 space-y-5 max-w-2xl"
        >
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-slate-700 dark:text-amber-200 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              Monetag Direct Link integration is configured cleanly outside active gameplay. Remember that a Direct Link
              by itself does not activate every Monetag ad format or verify publisher payouts until configured in your
              Monetag account.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Site Brand Name</label>
              <input
                name="siteName"
                defaultValue={overview.settings.siteName}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tagline</label>
              <input
                name="tagline"
                defaultValue={overview.settings.tagline}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Monetag Direct Link URL</label>
            <input
              name="monetagDirectLink"
              type="url"
              defaultValue={overview.settings.monetagDirectLink}
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Advertisement Disclosure Label</label>
            <input
              name="adsDisclosure"
              defaultValue={overview.settings.adsDisclosure}
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input name="adsEnabled" type="checkbox" defaultChecked={overview.settings.adsEnabled} />
              <span>Enable Sponsored Links</span>
            </label>
            <label className="flex items-center gap-2">
              <input name="analyticsEnabled" type="checkbox" defaultChecked={overview.settings.analyticsEnabled} />
              <span>Record Anonymous Play Counts</span>
            </label>
            <label className="flex items-center gap-2">
              <input name="maintenanceMode" type="checkbox" defaultChecked={overview.settings.maintenanceMode} />
              <span>Maintenance Notice</span>
            </label>
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
          >
            Save Configuration
          </button>
        </form>
      )}

      {tab === 'translations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Manage Categories</h2>
            <div className="space-y-2.5">
              {GAME_CATEGORIES.map((c) => {
                const enabled = overview.categoryOverrides[c.id]?.enabled !== false;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10">
                    <span className="text-sm font-semibold">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => saveCategoryToggle(c.id, !enabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        enabled ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white'
                      }`}
                    >
                      {enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <form
            onSubmit={saveTranslation}
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold">Override Translation Key</h2>
            <div>
              <label className="block text-xs font-semibold mb-1">Language</label>
              <select
                value={transLang}
                onChange={(e) => setTransLang(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Dot-Path Key (e.g. hero.headline)</label>
              <input
                value={transKey}
                onChange={(e) => setTransKey(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Translated Value (leave blank to clear)</label>
              <input
                value={transValue}
                onChange={(e) => setTransValue(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
            >
              Save Translation Override
            </button>
          </form>
        </div>
      )}

      {tab === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Client Error Logs</h2>
              {overview.errorLogs.length > 0 && (
                <button
                  type="button"
                  onClick={clearErrorLogs}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            {overview.errorLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No runtime errors recorded.</p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto text-xs">
                {overview.errorLogs.map((e) => (
                  <li key={e.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 space-y-1">
                    <div className="font-mono font-semibold text-rose-500">{e.message}</div>
                    <div className="text-slate-500">
                      {e.source} · {e.path} · {new Date(e.timestamp).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5 space-y-3">
            <h2 className="font-display text-lg font-bold">Contact Messages</h2>
            {overview.contactMessages.length === 0 ? (
              <p className="text-xs text-slate-500">No contact inquiries yet.</p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto text-xs">
                {overview.contactMessages.map((m) => (
                  <li key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {m.name} ({m.email})
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{m.message}</p>
                    <div className="text-slate-500">{new Date(m.timestamp).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
