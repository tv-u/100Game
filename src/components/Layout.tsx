import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Gamepad2,
  Globe,
  Heart,
  Home,
  Menu,
  Moon,
  Shuffle,
  SlidersHorizontal,
  Sun,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../config/site';
import { useApp } from '../context/AppContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';

export const Layout: React.FC<{ children: React.ReactNode; hideBottomNav?: boolean }> = ({
  children,
  hideBottomNav = false,
}) => {
  const { lang, setLang, t, prefs, toggleTheme, toggleSound, toggleHaptics, visibleGames, serverConfig } = useApp();
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length > 0 && SUPPORTED_LANGUAGES.some((l) => l.code === parts[0])) {
      parts[0] = newLang;
      navigate(`/${parts.join('/')}/` + location.search);
    } else {
      navigate(`/${newLang}/`);
    }
  };

  const handlePlayRandom = () => {
    if (visibleGames.length === 0) return;
    const random = visibleGames[Math.floor(Math.random() * visibleGames.length)];
    navigate(`/${lang}/games/${random.slug}/`);
  };

  const isActive = (subpath: string) => {
    const target = `/${lang}${subpath}`;
    if (subpath === '/') return location.pathname === `/${lang}` || location.pathname === `/${lang}/`;
    return location.pathname.startsWith(target);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#090B12] dark:text-slate-100">
      {/* Top Bar Contract: strictly 3 zones on desktop */}
      <header className="sticky top-0 z-40 h-14 sm:h-16 bg-white/90 dark:bg-[#090B12]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <Link
            to={`/${lang}/`}
            className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md"
          >
            {serverConfig.settings.siteName}
          </Link>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link
              to={`/${lang}/games/`}
              className={`whitespace-nowrap shrink-0 hover:text-slate-950 dark:hover:text-white transition-colors py-1 border-b-2 ${
                isActive('/games') ? 'border-violet-500 text-slate-950 dark:text-white' : 'border-transparent'
              }`}
            >
              {t.nav.games}
            </Link>
            <Link
              to={`/${lang}/categories/`}
              className={`whitespace-nowrap shrink-0 hover:text-slate-950 dark:hover:text-white transition-colors py-1 border-b-2 ${
                isActive('/categories') ? 'border-violet-500 text-slate-950 dark:text-white' : 'border-transparent'
              }`}
            >
              {t.nav.categories}
            </Link>
            <Link
              to={`/${lang}/popular/`}
              className={`whitespace-nowrap shrink-0 hover:text-slate-950 dark:hover:text-white transition-colors py-1 border-b-2 ${
                isActive('/popular') ? 'border-violet-500 text-slate-950 dark:text-white' : 'border-transparent'
              }`}
            >
              {t.nav.popular}
            </Link>
            <Link
              to={`/${lang}/favorites/`}
              className={`whitespace-nowrap shrink-0 hover:text-slate-950 dark:hover:text-white transition-colors py-1 border-b-2 ${
                isActive('/favorites') ? 'border-violet-500 text-slate-950 dark:text-white' : 'border-transparent'
              }`}
            >
              {t.nav.favorites}
            </Link>
            <Link
              to={`/${lang}/stats/`}
              className={`whitespace-nowrap shrink-0 hover:text-slate-950 dark:hover:text-white transition-colors py-1 border-b-2 ${
                isActive('/stats') ? 'border-violet-500 text-slate-950 dark:text-white' : 'border-transparent'
              }`}
            >
              {t.nav.stats}
            </Link>
          </nav>

          {/* Zone 3: Single primary action on desktop, quick settings sheet trigger on mobile/tablet */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePlayRandom}
              className="hidden lg:inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>{t.nav.playRandom}</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open language, theme, and menu controls"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 lg:hidden" />
              <Globe className="w-4 h-4 hidden lg:block" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 ${hideBottomNav ? 'pb-8' : 'pb-20 lg:pb-12'}`}>
        {children}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0F1A] pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div className="space-y-3">
            <div className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
              {serverConfig.settings.siteName}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.hero.tagline}
            </p>
            <PWAInstallButton variant="compact" />
          </div>

          <div className="space-y-2.5">
            <h4 className="font-display font-semibold text-slate-900 dark:text-white">Arcade</h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><Link to={`/${lang}/games/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.games}</Link></li>
              <li><Link to={`/${lang}/popular/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.popular}</Link></li>
              <li><Link to={`/${lang}/new/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.newGames}</Link></li>
              <li><Link to={`/${lang}/trending/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.trending}</Link></li>
              <li><Link to={`/${lang}/leaderboard/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.leaderboard}</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-display font-semibold text-slate-900 dark:text-white">Player Hub</h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><Link to={`/${lang}/instructions/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.instructions}</Link></li>
              <li><Link to={`/${lang}/favorites/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.favorites}</Link></li>
              <li><Link to={`/${lang}/recent/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.recent}</Link></li>
              <li><Link to={`/${lang}/stats/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.stats}</Link></li>
              <li><Link to={`/${lang}/faq/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.faq}</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-display font-semibold text-slate-900 dark:text-white">Company & Legal</h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><Link to={`/${lang}/about/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.about}</Link></li>
              <li><Link to={`/${lang}/contact/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.contact}</Link></li>
              <li><Link to={`/${lang}/privacy-policy/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.legal.privacyTitle}</Link></li>
              <li><Link to={`/${lang}/terms/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.legal.termsTitle}</Link></li>
              <li><Link to={`/${lang}/cookie-policy/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.legal.cookiesTitle}</Link></li>
              <li><Link to={`/${lang}/disclaimer/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.legal.disclaimerTitle}</Link></li>
              <li><Link to={`/${lang}/sitemap/`} className="hover:text-violet-600 dark:hover:text-violet-400">{t.nav.sitemap}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-white/5 py-4 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>© {new Date().getFullYear()} GOO GAME PLAY. {t.hero.tagline}</span>
            <Link to={`/${lang}/admin/`} className="hover:text-slate-800 dark:hover:text-slate-200">
              Admin
            </Link>
          </div>
        </div>
      </footer>

      {/* Android-like Mobile Bottom Navigation (<= 15% combined sticky height) */}
      {!hideBottomNav && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0D101D]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 pb-safe"
        >
          <div className="grid grid-cols-5 h-14 items-center">
            <Link
              to={`/${lang}/`}
              className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
                isActive('/') ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Home className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{t.nav.home}</span>
            </Link>
            <Link
              to={`/${lang}/games/`}
              className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
                isActive('/games') ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Gamepad2 className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{t.nav.games}</span>
            </Link>
            <Link
              to={`/${lang}/favorites/`}
              className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
                isActive('/favorites') ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Heart className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{t.nav.favorites}</span>
            </Link>
            <Link
              to={`/${lang}/stats/`}
              className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
                isActive('/stats') ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <BarChart3 className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{t.nav.stats}</span>
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col items-center justify-center h-full text-[10px] font-medium text-slate-500 dark:text-slate-400"
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{t.common.languageLabel}</span>
            </button>
          </div>
        </nav>
      )}

      {/* Offline Toast */}
      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-20 lg:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-lg"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{t.common.offlineBanner}</span>
        </div>
      )}

      {/* Settings, Language & Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-[#111524] h-full overflow-y-auto p-6 flex flex-col gap-6 border-l border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {serverConfig.settings.siteName}
              </h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close drawer"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Theme, Sound, Haptics */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                {prefs.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-600" />}
                <span>{prefs.theme === 'dark' ? t.common.themeLight : t.common.themeDark}</span>
              </button>

              <button
                type="button"
                onClick={toggleSound}
                className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                {prefs.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span>{prefs.soundEnabled ? t.common.soundOn : t.common.soundOff}</span>
              </button>

              <button
                type="button"
                onClick={toggleHaptics}
                className="col-span-2 flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <span>{prefs.hapticsEnabled ? t.common.hapticsOn : t.common.hapticsOff}</span>
              </button>
            </div>

            <PWAInstallButton variant="full" />

            {/* Quick Page Links */}
            <div className="space-y-2 border-t border-slate-200 dark:border-white/10 pt-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Navigation</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { to: `/${lang}/popular/`, label: t.nav.popular },
                  { to: `/${lang}/new/`, label: t.nav.newGames },
                  { to: `/${lang}/trending/`, label: t.nav.trending },
                  { to: `/${lang}/categories/`, label: t.nav.categories },
                  { to: `/${lang}/recent/`, label: t.nav.recent },
                  { to: `/${lang}/leaderboard/`, label: t.nav.leaderboard },
                  { to: `/${lang}/instructions/`, label: t.nav.instructions },
                  { to: `/${lang}/about/`, label: t.nav.about },
                  { to: `/${lang}/contact/`, label: t.nav.contact },
                  { to: `/${lang}/faq/`, label: t.nav.faq },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setDrawerOpen(false)}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-violet-600/10 hover:text-violet-600 dark:hover:text-violet-300 font-medium truncate"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* 22-Language Selector */}
            <div className="space-y-2 border-t border-slate-200 dark:border-white/10 pt-4">
              <label htmlFor="global-lang-select" className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.common.languageLabel} (22)
              </label>
              <select
                id="global-lang-select"
                value={lang}
                onChange={(e) => {
                  handleLanguageChange(e.target.value);
                  setDrawerOpen(false);
                }}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] px-3 text-sm text-slate-900 dark:text-white"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.englishName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
