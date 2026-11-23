import React, { Suspense, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ChevronRight, Heart, HelpCircle, Keyboard, Share2, Smartphone } from 'lucide-react';
import { getGameBySlug } from '../data/games';
import { useApp } from '../context/AppContext';
import { GameShell } from '../components/GameShell';
import { GameCard } from '../components/GameCard';
import { SponsoredBanner } from '../components/SponsoredBanner';
import { SeoHeadSync } from '../components/SeoHeadSync';
import { GAME_COMPONENT_MAP } from '../games/registry';

export const GamePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t, visibleGames, stats, serverConfig, isFavorite, toggleFavorite } = useApp();
  const [liveScore, setLiveScore] = useState(0);
  const [copied, setCopied] = useState(false);

  const baseGame = getGameBySlug(slug);
  const localizedGame = visibleGames.find((g) => g.slug === slug) || baseGame;
  const GameComponent = slug ? GAME_COMPONENT_MAP[slug] : undefined;

  if (!localizedGame || !GameComponent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <SeoHeadSync title="Game Not Found | GOO-100 GAME PLAY" description="The requested game could not be found." />
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Game not found</h1>
        <Link
          to={`/${lang}/games/`}
          className="inline-flex items-center min-h-[44px] px-6 rounded-xl bg-violet-600 text-white text-sm font-semibold"
        >
          {t.common.backToGames}
        </Link>
      </div>
    );
  }

  const override = serverConfig.gameOverrides?.[localizedGame.slug];
  if (override?.enabled === false) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Game temporarily unavailable</h1>
        <Link
          to={`/${lang}/games/`}
          className="inline-flex items-center min-h-[44px] px-6 rounded-xl bg-violet-600 text-white text-sm font-semibold"
        >
          {t.common.backToGames}
        </Link>
      </div>
    );
  }

  const fav = isFavorite(localizedGame.slug);
  const bestScore = Math.max(liveScore, stats[localizedGame.slug]?.bestScore || 0);
  const relatedSameCategory = visibleGames.filter(
    (g) => g.slug !== localizedGame.slug && g.category === localizedGame.category
  );
  const related = (relatedSameCategory.length >= 3 ? relatedSameCategory : visibleGames.filter((g) => g.slug !== localizedGame.slug)).slice(0, 3);

  const handleCopyShare = () => {
    if (navigator.clipboard && window.location) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-7">
      <SeoHeadSync
        title={override?.seoTitle || localizedGame.seoTitle}
        description={override?.seoDescription || localizedGame.seoDescription}
      />

      {/* Breadcrumb + Quick Favorite / Share Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Link to={`/${lang}/`} className="hover:text-cyan-400">
            {t.nav.home}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`/${lang}/categories/${localizedGame.category}/`} className="hover:text-cyan-400">
            {t.categories[localizedGame.category]}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-900 dark:text-white truncate">{localizedGame.title}</span>
        </nav>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            #{String(localizedGame.number).padStart(2, '0')} · {localizedGame.difficulty}
          </span>
          <button
            type="button"
            onClick={() => toggleFavorite(localizedGame.slug)}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D132B] text-slate-700 dark:text-slate-200 hover:border-rose-400/50"
          >
            <Heart className={`w-4 h-4 ${fav ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{fav ? t.common.unfavorite : t.common.favorite}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyShare}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D132B] text-slate-700 dark:text-slate-200 hover:border-cyan-400/50"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? t.common.linkCopied : t.common.share}</span>
          </button>
        </div>
      </div>

      {/* Focused Game Arena */}
      <GameShell game={localizedGame} currentScore={liveScore} bestScore={bestScore}>
        {(ctx) => (
          <Suspense
            fallback={
              <div className="w-full py-20 flex flex-col items-center justify-center gap-3 text-sm text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span>{t.common.loadingGame}</span>
              </div>
            }
          >
            <GameComponent ctx={ctx} onScoreChange={setLiveScore} gameSlug={localizedGame.slug} />
          </Suspense>
        )}
      </GameShell>

      {/* Instructions & Controls below active gameplay */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D132B] p-5 sm:p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            {t.common.howToPlay}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {localizedGame.fullDescription}
          </p>
          <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-200 list-decimal list-inside pt-1">
            {localizedGame.howToPlay.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D132B] p-5 sm:p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-violet-400" />
              <span>{t.common.desktopControls}</span>
            </h3>
            <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              {localizedGame.desktopControls.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>{t.common.mobileControls}</span>
            </h3>
            <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              {localizedGame.mobileControls.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Per-Game FAQ Section */}
      {localizedGame.faq && localizedGame.faq.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D132B] p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span>{localizedGame.title} FAQ</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localizedGame.faq.map((item, idx) => (
              <div key={idx} className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-4 space-y-1.5">
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">{item.q}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Non-intrusive Sponsor Card strictly outside gameplay */}
      <SponsoredBanner />

      {/* Related Games */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          {t.common.relatedGames}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {related.map((g) => (
            <GameCard key={g.slug} game={g} />
          ))}
        </div>
      </section>
    </div>
  );
};
