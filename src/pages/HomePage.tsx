import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flame, Play, Trophy } from 'lucide-react';
import { GAME_CATEGORIES, PRIORITY_GAME_SLUGS } from '../data/games';
import { useApp } from '../context/AppContext';
import { GameCard } from '../components/GameCard';
import { GameArtwork } from '../components/GameArtwork';
import { SponsoredBanner } from '../components/SponsoredBanner';
import { SeoHeadSync } from '../components/SeoHeadSync';

interface RealTopRecord {
  slug: string;
  title: string;
  playerName: string;
  score: number;
  sourceLabel: string;
}

export const HomePage: React.FC = () => {
  const { lang, t, visibleGames, recentGames, stats, serverConfig } = useApp();
  const [lbOffset, setLbOffset] = useState(0);
  const [realRecords, setRealRecords] = useState<RealTopRecord[]>([]);

  // Featured 3 horizontal neon cards (purple, emerald, cyan) matching reference screenshot
  const featuredSlugs = ['2048', 'endless-runner', 'chess'];
  const featuredGames = featuredSlugs
    .map((s) => visibleGames.find((g) => g.slug === s))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));
  const featuredNeon = ['dark:neon-card-purple', 'dark:neon-card-emerald', 'dark:neon-card-cyan'];

  // Quick games 6-column portrait showcase
  const quickGames = visibleGames
    .filter((g) => ['snake', 'tetris', 'bubble-shooter', 'block-blast', 'fruit-merge', 'tower-defense'].includes(g.slug))
    .slice(0, 6);

  // 10 High-Engagement Priority games
  const priorityGames = PRIORITY_GAME_SLUGS.map((s) => visibleGames.find((g) => g.slug === s)).filter(
    (g): g is NonNullable<typeof g> => Boolean(g)
  );

  // Trending by real plays + editorial trending flag
  const trendingGames = [...visibleGames]
    .sort((a, b) => {
      const diff = (serverConfig.playsByGame?.[b.slug] || 0) - (serverConfig.playsByGame?.[a.slug] || 0);
      if (diff !== 0) return diff;
      return Number(b.isTrending) - Number(a.isTrending);
    })
    .slice(0, 4);

  // Recommended / Recently Played
  const recentItems = recentGames
    .map((r) => visibleGames.find((g) => g.slug === r.slug))
    .filter((g): g is NonNullable<typeof g> => Boolean(g))
    .slice(0, 4);
  const recommendedGames = recentItems.length > 0 ? recentItems : visibleGames.slice(0, 4);

  // Load real Leaderboard records (or fallback strictly to real local device stats—never fake data)
  useEffect(() => {
    let active = true;
    const probeSlugs = ['2048', 'endless-runner', 'snake', 'tetris', 'sudoku', 'block-blast'];
    Promise.all(
      probeSlugs.map((slug) =>
        fetch(`/api/leaderboard?game=${encodeURIComponent(slug)}`)
          .then((r) => r.json())
          .then((d) => ({ slug, entries: Array.isArray(d.entries) ? d.entries : [] }))
          .catch(() => ({ slug, entries: [] }))
      )
    ).then((results) => {
      if (!active) return;
      const collected: RealTopRecord[] = [];
      for (const item of results) {
        const game = visibleGames.find((g) => g.slug === item.slug);
        if (!game) continue;
        if (item.entries.length > 0) {
          const top = item.entries[0];
          collected.push({
            slug: item.slug,
            title: game.title,
            playerName: top.playerName || t.common.guestMode,
            score: Number(top.score) || 0,
            sourceLabel: 'Verified Score',
          });
        } else if ((stats[item.slug]?.bestScore || 0) > 0) {
          collected.push({
            slug: item.slug,
            title: game.title,
            playerName: t.common.guestMode,
            score: stats[item.slug].bestScore,
            sourceLabel: 'Device Best',
          });
        }
      }
      collected.sort((a, b) => b.score - a.score);
      setRealRecords(collected);
    });
    return () => {
      active = false;
    };
  }, [stats, t.common.guestMode, visibleGames]);

  const slotGames = ['2048', 'endless-runner', 'snake', 'tetris', 'sudoku', 'block-blast'];
  const visibleLbIndices = [0, 1, 2].map((i) => (lbOffset + i) % 3);
  const rankThemes = [
    { cardClass: 'dark:neon-card-purple', badgeBg: 'bg-gradient-to-br from-violet-500 to-fuchsia-600' },
    { cardClass: 'dark:neon-card-gold', badgeBg: 'bg-gradient-to-br from-amber-400 to-orange-500' },
    { cardClass: 'dark:neon-card-coral', badgeBg: 'bg-gradient-to-br from-rose-500 to-red-600' },
  ];

  return (
    <>
      <SeoHeadSync
        title={`GOO-100 GAME PLAY – ${t.hero.tagline}`}
        description={t.hero.subheadline}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 pb-10 space-y-8">
        {/* 1. Reference Hero Stack: 3 Large Featured Horizontal Cards */}
        <section aria-label={t.sections.featuredTitle} className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {t.sections.featuredTitle}
            </h1>
            <Link
              to={`/${lang}/games/`}
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline whitespace-nowrap"
            >
              {t.hero.ctaPrimary} →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {featuredGames.map((game, idx) => {
              const plays = serverConfig.playsByGame?.[game.slug] || 0;
              return (
                <div
                  key={game.slug}
                  className={`group relative rounded-2xl overflow-hidden bg-[#0D132B] border border-slate-200 dark:border-white/10 ${featuredNeon[idx % 3]} min-h-[190px] sm:min-h-[210px] flex flex-col justify-end p-5`}
                >
                  <GameArtwork
                    slug={game.slug}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#070B19]/55 to-transparent" />

                  {plays > 0 && (
                    <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-xs text-[11px] font-mono font-bold text-amber-300">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{plays}</span>
                    </div>
                  )}

                  <div className="relative z-10 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-cyan-300 truncate">
                        {t.categories[game.category]} · {game.difficulty}
                      </div>
                      <h2 className="font-display text-xl font-extrabold text-white truncate mt-0.5">{game.title}</h2>
                      <p className="text-xs text-slate-300 truncate mt-0.5">{game.controlsType}</p>
                    </div>
                    <Link
                      to={`/${lang}/games/${game.slug}/`}
                      className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 shadow-[0_0_18px_rgba(56,189,248,0.45)] transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t.common.playNow}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. Reference Leaderboard Panel (Ranks 1–3, Real Records Only) */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:neon-panel p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-5">
              <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>{t.nav.leaderboard}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real high scores recorded by players and on this device across 100 games.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/${lang}/leaderboard/`}
                className="min-h-[38px] px-3.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-800 dark:text-white inline-flex items-center"
              >
                {t.common.seeAll}
              </Link>
              <button
                type="button"
                aria-label="Previous leaderboard cards"
                onClick={() => setLbOffset((v) => (v + 2) % 3)}
                className="min-h-[38px] min-w-[38px] rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-white/15 flex items-center justify-center text-slate-700 dark:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next leaderboard cards"
                onClick={() => setLbOffset((v) => (v + 1) % 3)}
                className="min-h-[38px] min-w-[38px] rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-[0_0_14px_rgba(168,85,247,0.4)]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visibleLbIndices.map((rankIdx) => {
              const theme = rankThemes[rankIdx];
              const record = realRecords[rankIdx];
              const fallbackGame = visibleGames.find((g) => g.slug === slotGames[rankIdx]) || visibleGames[rankIdx];

              return (
                <div
                  key={rankIdx}
                  className={`rounded-2xl bg-slate-50 dark:bg-[#0D132B] border border-slate-200 dark:border-white/10 ${theme.cardClass} p-4 flex items-center justify-between gap-3`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/15">
                      <GameArtwork slug={record ? record.slug : fallbackGame.slug} />
                    </div>
                    <div className="min-w-0">
                      {record ? (
                        <>
                          <div className="font-mono text-base font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
                            {record.score} pts
                          </div>
                          <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-300 truncate">
                            {record.playerName} · {record.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{record.sourceLabel}</div>
                        </>
                      ) : (
                        <>
                          <div className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                            {fallbackGame.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            No score set yet
                          </div>
                          <Link
                            to={`/${lang}/games/${fallbackGame.slug}/`}
                            className="inline-block text-[11px] font-bold text-cyan-500 hover:underline mt-0.5"
                          >
                            Set 1st Record →
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    className={`w-11 h-11 rounded-xl ${theme.badgeBg} flex items-center justify-center font-display text-lg font-extrabold text-white shrink-0 shadow-lg`}
                  >
                    {rankIdx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Reference "Quick games" 6-Column Colorful Neon Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
              {t.sections.quickGamesTitle}
            </h2>
            <Link
              to={`/${lang}/games/`}
              className="min-h-[38px] px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold inline-flex items-center whitespace-nowrap shadow-[0_0_16px_rgba(168,85,247,0.38)]"
            >
              {t.common.seeAll}
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {quickGames.map((game) => (
              <GameCard key={game.slug} game={game} variant="quick" />
            ))}
          </div>
        </section>

        {/* Non-intrusive Monetag Sponsored Card outside active gameplay */}
        <SponsoredBanner />

        {/* 4. 10 High-Engagement Priority Games */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
                {t.sections.priorityTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.sections.whyPlaySubtitle}
              </p>
            </div>
            <Link to={`/${lang}/popular/`} className="text-xs font-semibold text-cyan-500 hover:underline whitespace-nowrap">
              {t.common.seeAll} →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {priorityGames.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>

        {/* 5. Explore 9 Categories Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
              {t.sections.categoriesTitle}
            </h2>
            <Link to={`/${lang}/categories/`} className="text-xs font-semibold text-cyan-500 hover:underline whitespace-nowrap">
              {t.common.seeAll} →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAME_CATEGORIES.filter((c) => serverConfig.categoryOverrides?.[c.id]?.enabled !== false).map((cat) => {
              const count = visibleGames.filter((g) => g.category === cat.id).length;
              return (
                <Link
                  key={cat.id}
                  to={`/${lang}/categories/${cat.id}/`}
                  className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D132B] hover:border-cyan-400/50 p-4 flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono font-semibold text-cyan-500 tabular-nums">{count} Games</div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {t.categories[cat.id]}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">{cat.description}</p>
                  </div>
                  <span
                    className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-inner"
                    style={{ backgroundColor: cat.accentHex }}
                  >
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 6. Trending & Recommended/Recently Played */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
                {t.sections.trendingTitle}
              </h2>
              <Link to={`/${lang}/trending/`} className="text-xs font-semibold text-cyan-500 hover:underline">
                {t.common.seeAll} →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trendingGames.slice(0, 2).map((g) => (
                <GameCard key={g.slug} game={g} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
                {t.sections.recommendedTitle}
              </h2>
              <Link to={`/${lang}/recent/`} className="text-xs font-semibold text-cyan-500 hover:underline">
                {t.common.seeAll} →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendedGames.slice(0, 2).map((g) => (
                <GameCard key={g.slug} game={g} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
