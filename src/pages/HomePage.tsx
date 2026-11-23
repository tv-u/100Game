import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gamepad2, Globe, ShieldCheck, Smartphone, Wifi } from 'lucide-react';
import { GAME_CATEGORIES } from '../data/games';
import { useApp } from '../context/AppContext';
import { GameCard } from '../components/GameCard';
import { SponsoredBanner } from '../components/SponsoredBanner';
import { SeoHeadSync } from '../components/SeoHeadSync';
import { PWAInstallButton } from '../components/PWAInstallButton';

export const HomePage: React.FC = () => {
  const { lang, t, visibleGames, recentGames } = useApp();

  const popularGames = visibleGames.filter((g) => g.isPopular).slice(0, 6);
  const trendingGames = visibleGames.filter((g) => g.isTrending).slice(0, 4);
  const recentItems = recentGames
    .map((r) => visibleGames.find((g) => g.slug === r.slug))
    .filter((g): g is NonNullable<typeof g> => Boolean(g))
    .slice(0, 4);

  return (
    <>
      <SeoHeadSync
        title={`GOO GAME PLAY – ${t.hero.tagline}`}
        description={t.hero.subheadline}
      />

      {/* Hero Split Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between gap-6 py-2">
            <div className="space-y-4">
              <div className="text-xs font-semibold tracking-wide text-violet-600 dark:text-violet-400">
                GOO GAME PLAY · {t.hero.tagline}
              </div>
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] text-balance">
                {t.hero.headline}
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {t.hero.subheadline}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/${lang}/games/`}
                  className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <span>{t.hero.ctaPrimary}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={`/${lang}/instructions/`}
                  className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-xl border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 text-sm font-semibold whitespace-nowrap transition-colors"
                >
                  <span>{t.hero.ctaSecondary}</span>
                </Link>
                <PWAInstallButton variant="compact" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.hero.instantPlayNote}</p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[240px] sm:min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-[#0C1020]">
              <img
                src="/src/assets/images/arcade_hero_banner_1795426212632.jpg"
                alt="GOO GAME PLAY desktop and mobile instant arcade setup"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs text-violet-300 font-medium">{t.sections.featuredTitle}</div>
                  <div className="font-display text-xl font-bold text-white mt-0.5">
                    Snake · 2048 · Tetris · Sudoku
                  </div>
                </div>
                <Link
                  to={`/${lang}/games/snake/`}
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold whitespace-nowrap"
                >
                  <span>{t.common.playNow}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Platform Proof Strip */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: Gamepad2, title: '10 Playable Games', desc: 'Original HTML5 Canvas & logic engines' },
            { icon: Smartphone, title: 'Mobile App Feel', desc: 'Swipe gestures, haptics & fullscreen' },
            { icon: Wifi, title: 'Offline PWA Ready', desc: 'Cached games work without signal' },
            { icon: Globe, title: '22 Languages', desc: 'Automatic locale & RTL adaptation' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-4 flex items-start gap-3"
            >
              <item.icon className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-display text-sm font-bold text-slate-900 dark:text-white">{item.title}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recently Played Resume Strip (only when user has history) */}
      {recentItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {t.nav.recent}
            </h2>
            <Link to={`/${lang}/recent/`} className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline">
              {t.nav.games} →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentItems.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>
      )}

      {/* Popular Games Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              {t.sections.popularTitle}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t.sections.whyPlaySubtitle}
            </p>
          </div>
          <Link
            to={`/${lang}/games/`}
            className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap"
          >
            {t.nav.games} →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {popularGames.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </section>

      {/* Non-intrusive Monetag Sponsored Placement between sections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <SponsoredBanner />
      </section>

      {/* Explore Categories with Custom Generated Visuals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {t.sections.categoriesTitle}
          </h2>
          <Link
            to={`/${lang}/categories/`}
            className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap"
          >
            {t.nav.categories} →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {GAME_CATEGORIES.slice(0, 3).map((cat) => (
            <Link
              key={cat.id}
              to={`/${lang}/categories/${cat.id}/`}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-[#111524]"
            >
              <img
                src={cat.bannerPath}
                alt={cat.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="font-display text-lg font-bold text-white">{t.categories[cat.id]}</div>
                <p className="text-xs text-slate-200 mt-1 line-clamp-2">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending This Week */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {t.sections.trendingTitle}
          </h2>
          <Link
            to={`/${lang}/trending/`}
            className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap"
          >
            {t.nav.trending} →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trendingGames.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </section>

      {/* SEO Value & Privacy Summary Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Guest Mode · Anonymous Local Progress</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              {t.sections.whyPlayTitle}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Play free HTML5 mini games online without installing an app or registering an account. Every game on GOO
              GAME PLAY runs natively in your browser with automatic pause when you switch tabs, touch-locked surfaces to
              prevent accidental page scrolling, and offline caching once installed as a Progressive Web App.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Free online games', to: `/${lang}/games/` },
              { label: 'Play Snake online', to: `/${lang}/games/snake/` },
              { label: 'Play 2048 puzzle', to: `/${lang}/games/2048/` },
              { label: 'Play Sudoku online', to: `/${lang}/games/sudoku/` },
              { label: 'Mobile browser arcade', to: `/${lang}/categories/arcade/` },
              { label: 'Offline PWA instructions', to: `/${lang}/faq/` },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-violet-500/50 text-slate-700 dark:text-slate-200 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
