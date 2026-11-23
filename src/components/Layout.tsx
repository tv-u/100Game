import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  Flame,
  Gamepad2,
  Globe,
  Heart,
  History,
  Home,
  Menu,
  Moon,
  Puzzle,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Swords,
  Trophy,
  UserCheck,
  Volume2,
  VolumeX,
  WifiOff,
  X,
  Zap,
  Flag,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../config/site';
import { GAME_CATEGORIES, type GameCategoryId } from '../data/games';
import { useApp } from '../context/AppContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';

const CATEGORY_ICONS: Record<GameCategoryId, React.ComponentType<{ className?: string }>> = {
  arcade: Zap,
  puzzle: Puzzle,
  board: Shield,
  'racing-sports': Flag,
  casual: Sparkles,
  strategy: Swords,
  'word-edu': BookOpen,
  adventure: Compass,
  skill: Flame,
};

export const Layout: React.FC<{ children: React.ReactNode; hideBottomNav?: boolean }> = ({
  children,
  hideBottomNav = false,
}) => {
  const { lang, setLang, t, prefs, toggleTheme, toggleSound, toggleHaptics, visibleGames, serverConfig } = useApp();
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState('');

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

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = headerQuery.trim();
    navigate(q ? `/${lang}/games/?q=${encodeURIComponent(q)}` : `/${lang}/games/`);
  };

  const isActive = (subpath: string) => {
    const target = `/${lang}${subpath}`;
    if (subpath === '/') return location.pathname === `/${lang}` || location.pathname === `/${lang}/`;
    return location.pathname.startsWith(target);
  };

  const primarySidebarLinks = [
    { to: `/${lang}/`, subpath: '/', label: t.nav.home, icon: Home },
    { to: `/${lang}/games/`, subpath: '/games', label: t.nav.games, icon: Gamepad2 },
    { to: `/${lang}/trending/`, subpath: '/trending', label: t.nav.trending, icon: Flame },
    { to: `/${lang}/favorites/`, subpath: '/favorites', label: t.nav.favorites, icon: Heart },
    { to: `/${lang}/recent/`, subpath: '/recent', label: t.nav.recent, icon: History },
    { to: `/${lang}/stats/`, subpath: '/stats', label: t.nav.stats, icon: BarChart3 },
    { to: `/${lang}/leaderboard/`, subpath: '/leaderboard', label: t.nav.leaderboard, icon: Trophy },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#070B19] dark:text-slate-100">
      {/* Fixed Left Vertical Gaming Sidebar (Desktop lg+) */}
      <aside
        aria-label="Primary Gaming Sidebar"
        className="hidden lg:flex lg:flex-col lg:w-[232px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-white dark:bg-[#0B1024] border-r border-slate-200 dark:border-white/10 overflow-y-auto"
      >
        <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-200 dark:border-white/10 shrink-0">
          <Link
            to={`/${lang}/`}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.5)]">
              <Gamepad2 className="w-4 h-4 text-white" />
            </span>
            <span className="font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              GOO-100
            </span>
          </Link>
        </div>

        <nav className="p-3 space-y-1">
          {primarySidebarLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.subpath);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_18px_rgba(139,92,246,0.45)]'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 whitespace-nowrap transition-all"
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="truncate">{t.nav.settings}</span>
          </button>
        </nav>

        <div className="mx-3 my-1 border-t border-slate-200 dark:border-white/10" />

        {/* 9 Categories Section */}
        <div className="p-3 space-y-1 pb-6">
          <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            {t.nav.categories} (9)
          </div>
          {GAME_CATEGORIES.filter((c) => serverConfig.categoryOverrides?.[c.id]?.enabled !== false).map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id];
            const path = `/${lang}/categories/${cat.id}/`;
            const active = location.pathname.startsWith(path);
            return (
              <Link
                key={cat.id}
                to={path}
                className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/35'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{t.categories[cat.id]}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Right Workspace Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Reference-Locked Horizontal Top Navigation Bar */}
        <header className="sticky top-0 z-40 h-16 bg-white/95 dark:bg-[#0B1024]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
          <div className="h-full px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-5">
            {/* Left cluster: Mobile Menu + Brand on <lg, plus Random Play CTA + Language Dropdown */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link
                to={`/${lang}/`}
                className="lg:hidden flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 text-white" />
                </span>
                <span className="font-display text-sm font-extrabold text-slate-900 dark:text-white">GOO-100</span>
              </Link>

              <button
                type="button"
                onClick={handlePlayRandom}
                className="hidden sm:inline-flex items-center gap-2 min-h-[40px] px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold whitespace-nowrap shrink-0 shadow-[0_0_18px_rgba(168,85,247,0.38)] transition-all"
              >
                <span>{t.nav.playRandom}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="relative hidden md:block">
                <select
                  aria-label={t.common.languageLabel}
                  value={lang}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="min-h-[40px] px-3 pr-7 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#111735] text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Center/Right: Working Search Bar + Settings Trigger + Honest Guest Mode Badge */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end max-w-xl">
              <form onSubmit={handleHeaderSearch} className="relative flex-1 max-w-xs sm:max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={headerQuery}
                  onChange={(e) => setHeaderQuery(e.target.value)}
                  placeholder={t.common.searchPlaceholder}
                  aria-label={t.common.searchPlaceholder}
                  className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#101631] text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </form>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open theme, audio, and language settings"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#101631] text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 transition-colors shrink-0"
              >
                <Globe className="w-4 h-4" />
              </button>

              <Link
                to={`/${lang}/stats/`}
                className="hidden sm:flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#101631] hover:border-violet-400/50 transition-colors shrink-0"
              >
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white">
                  <UserCheck className="w-3.5 h-3.5" />
                </span>
                <div className="leading-tight text-left">
                  <div className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {t.common.guestMode}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {t.nav.stats}
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className={`flex-1 ${hideBottomNav ? 'pb-8' : 'pb-20 lg:pb-12'}`}>{children}</main>

        {/* Clean Footer */}
        <footer className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F24] pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
            <div className="space-y-3">
              <div className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
                {serverConfig.settings.siteName}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{t.hero.tagline}</p>
              <PWAInstallButton variant="compact" />
            </div>

            <div className="space-y-2.5">
              <h4 className="font-display font-semibold text-slate-900 dark:text-white">Arcade</h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to={`/${lang}/games/`} className="hover:text-cyan-400">{t.nav.games}</Link></li>
                <li><Link to={`/${lang}/popular/`} className="hover:text-cyan-400">{t.nav.popular}</Link></li>
                <li><Link to={`/${lang}/new/`} className="hover:text-cyan-400">{t.nav.newGames}</Link></li>
                <li><Link to={`/${lang}/trending/`} className="hover:text-cyan-400">{t.nav.trending}</Link></li>
                <li><Link to={`/${lang}/leaderboard/`} className="hover:text-cyan-400">{t.nav.leaderboard}</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-display font-semibold text-slate-900 dark:text-white">Player Hub</h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to={`/${lang}/instructions/`} className="hover:text-cyan-400">{t.nav.instructions}</Link></li>
                <li><Link to={`/${lang}/favorites/`} className="hover:text-cyan-400">{t.nav.favorites}</Link></li>
                <li><Link to={`/${lang}/recent/`} className="hover:text-cyan-400">{t.nav.recent}</Link></li>
                <li><Link to={`/${lang}/stats/`} className="hover:text-cyan-400">{t.nav.stats}</Link></li>
                <li><Link to={`/${lang}/faq/`} className="hover:text-cyan-400">{t.nav.faq}</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-display font-semibold text-slate-900 dark:text-white">Company & Legal</h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to={`/${lang}/about/`} className="hover:text-cyan-400">{t.nav.about}</Link></li>
                <li><Link to={`/${lang}/contact/`} className="hover:text-cyan-400">{t.nav.contact}</Link></li>
                <li><Link to={`/${lang}/privacy-policy/`} className="hover:text-cyan-400">{t.legal.privacyTitle}</Link></li>
                <li><Link to={`/${lang}/terms/`} className="hover:text-cyan-400">{t.legal.termsTitle}</Link></li>
                <li><Link to={`/${lang}/cookie-policy/`} className="hover:text-cyan-400">{t.legal.cookiesTitle}</Link></li>
                <li><Link to={`/${lang}/disclaimer/`} className="hover:text-cyan-400">{t.legal.disclaimerTitle}</Link></li>
                <li><Link to={`/${lang}/sitemap/`} className="hover:text-cyan-400">{t.nav.sitemap}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 dark:border-white/5 py-4 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>© {new Date().getFullYear()} GOO GAME PLAY · 100 Instant Browser Games.</span>
              <Link to={`/${lang}/admin/`} className="hover:text-slate-200">
                Admin
              </Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation (<= 15% combined sticky height) */}
      {!hideBottomNav && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B1024]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 pb-safe"
        >
          <div className="grid grid-cols-5 h-14 items-center">
            <Link
              to={`/${lang}/`}
              className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
                isActive('/') ? 'text-cyan-500' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Home className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{t.nav.home}</span>
            </Link>
            <Link
              to={`/${lang}/games/`}
              className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
                isActive('/games') ? 'text-cyan-500' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Gamepad2 className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{t.nav.games}</span>
            </Link>
            <Link
              to={`/${lang}/favorites/`}
              className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
                isActive('/favorites') ? 'text-cyan-500' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Heart className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{t.nav.favorites}</span>
            </Link>
            <Link
              to={`/${lang}/leaderboard/`}
              className={`flex flex-col items-center justify-center h-full text-[10px] font-medium ${
                isActive('/leaderboard') ? 'text-cyan-500' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Trophy className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{t.nav.leaderboard}</span>
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col items-center justify-center h-full text-[10px] font-medium text-slate-500 dark:text-slate-400"
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[64px]">{t.nav.settings}</span>
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

      {/* Slide Drawer: Settings, Language, Categories & Quick Actions */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-[#0B1024] h-full overflow-y-auto p-6 flex flex-col gap-6 border-l border-slate-200 dark:border-white/10">
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
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#070B19] px-3 text-sm text-slate-900 dark:text-white"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.englishName})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 border-t border-slate-200 dark:border-white/10 pt-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.nav.categories}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {GAME_CATEGORIES.map((c) => (
                  <Link
                    key={c.id}
                    to={`/${lang}/categories/${c.id}/`}
                    onClick={() => setDrawerOpen(false)}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:text-cyan-400 font-medium truncate"
                  >
                    {t.categories[c.id]}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
