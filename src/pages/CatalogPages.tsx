import React, { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { GAME_CATEGORIES, type GameCategoryId } from '../data/games';
import { useApp } from '../context/AppContext';
import { GameCard } from '../components/GameCard';
import { SeoHeadSync } from '../components/SeoHeadSync';
import { SponsoredBanner } from '../components/SponsoredBanner';

export const AllGamesPage: React.FC = () => {
  const { lang, t, visibleGames, serverConfig } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'popular' | 'alpha'>('default');

  const urlQ = searchParams.get('q') || '';
  React.useEffect(() => {
    setQuery(urlQ);
  }, [urlQ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = visibleGames.filter((g) => {
      if (category !== 'all' && g.category !== category) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.shortDescription.toLowerCase().includes(q) ||
        g.controlsType.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      );
    });

    if (sortBy === 'popular') {
      return [...list].sort(
        (a, b) => (serverConfig.playsByGame?.[b.slug] || 0) - (serverConfig.playsByGame?.[a.slug] || 0)
      );
    }
    if (sortBy === 'alpha') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [category, query, serverConfig.playsByGame, sortBy, visibleGames]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SeoHeadSync
        title={`${t.nav.games} | GOO-100 GAME PLAY`}
        description="Search, filter, and play all 100 free HTML5 mini games across 9 categories instantly in your mobile or desktop browser."
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t.nav.games}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {filtered.length} playable browser games · Zero downloads
          </p>
        </div>

        {/* Search & Sort Workspace Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchParams(e.target.value ? { q: e.target.value } : {});
              }}
              placeholder={t.common.searchPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-9 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111524] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSearchParams({});
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'default' | 'popular' | 'alpha')}
            aria-label="Sort games"
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#111524] text-sm text-slate-900 dark:text-white"
          >
            <option value="default">Featured Order</option>
            <option value="popular">Most Played (Real Usage)</option>
            <option value="alpha">Alphabetical (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
            category === 'all'
              ? 'bg-violet-600 text-white'
              : 'bg-white dark:bg-[#111524] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
          }`}
        >
          {t.common.allCategories}
        </button>
        {GAME_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              category === cat.id
                ? 'bg-violet-600 text-white'
                : 'bg-white dark:bg-[#111524] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.categories[cat.id]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-10 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t.common.noResults}</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('all');
              setSearchParams({});
            }}
            className="min-h-[44px] px-5 rounded-xl bg-violet-600 text-white text-xs font-semibold"
          >
            {t.common.clearFilters}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      )}

      <SponsoredBanner />
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Explore more: <Link to={`/${lang}/popular/`} className="text-violet-500 hover:underline">{t.nav.popular}</Link> ·{' '}
        <Link to={`/${lang}/new/`} className="text-violet-500 hover:underline">{t.nav.newGames}</Link> ·{' '}
        <Link to={`/${lang}/trending/`} className="text-violet-500 hover:underline">{t.nav.trending}</Link>
      </div>
    </div>
  );
};

export const CollectionPage: React.FC<{ mode: 'popular' | 'new' | 'trending' }> = ({ mode }) => {
  const { t, visibleGames, serverConfig } = useApp();

  const games = useMemo(() => {
    if (mode === 'popular') {
      return [...visibleGames].sort((a, b) => {
        const diff = (serverConfig.playsByGame?.[b.slug] || 0) - (serverConfig.playsByGame?.[a.slug] || 0);
        if (diff !== 0) return diff;
        return Number(b.isPopular) - Number(a.isPopular);
      });
    }
    if (mode === 'new') return visibleGames.filter((g) => g.isNew);
    return visibleGames.filter((g) => g.isTrending);
  }, [mode, serverConfig.playsByGame, visibleGames]);

  const title = mode === 'popular' ? t.sections.popularTitle : mode === 'new' ? t.sections.newTitle : t.sections.trendingTitle;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SeoHeadSync title={`${title} | GOO GAME PLAY`} description={`Play ${title.toLowerCase()} directly in your browser.`} />
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6 sm:p-8">
        <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">
          GOO GAME PLAY · {mode.toUpperCase()}
        </div>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-2xl">
          Instant-launch HTML5 games curated for responsive mobile touch and desktop keyboard gameplay.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {games.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
      <SponsoredBanner />
    </div>
  );
};

export const CategoriesPage: React.FC = () => {
  const { lang, t, visibleGames, serverConfig } = useApp();
  const { categoryId } = useParams<{ categoryId?: string }>();

  if (categoryId) {
    const cat = GAME_CATEGORIES.find((c) => c.id === categoryId);
    const matching = visibleGames.filter((g) => g.category === categoryId);
    if (!cat) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold">Category not found</h1>
          <Link to={`/${lang}/categories/`} className="inline-block px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold">
            {t.nav.categories}
          </Link>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <SeoHeadSync title={`${cat.name} | GOO GAME PLAY`} description={cat.description} />
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 min-h-[180px] flex items-end p-6 sm:p-8">
          <img
            src={cat.bannerPath}
            alt={cat.name}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30" />
          <div className="relative z-10 max-w-xl">
            <div className="text-xs text-violet-300 font-medium">{t.nav.categories}</div>
            <h1 className="font-display text-3xl font-extrabold text-white mt-1">{t.categories[cat.id]}</h1>
            <p className="text-sm text-slate-200 mt-2">{cat.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {matching.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SeoHeadSync title={`${t.nav.categories} | GOO GAME PLAY`} description={t.sections.categoriesTitle} />
      <div>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t.nav.categories}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t.sections.categoriesTitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {GAME_CATEGORIES.filter((c) => serverConfig.categoryOverrides?.[c.id]?.enabled !== false).map((cat) => {
          const count = visibleGames.filter((g) => g.category === (cat.id as GameCategoryId)).length;
          return (
            <Link
              key={cat.id}
              to={`/${lang}/categories/${cat.id}/`}
              className="group rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] flex flex-col"
            >
              <div className="aspect-[16/9] overflow-hidden relative bg-slate-900">
                <img
                  src={cat.bannerPath}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{count} games</div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {t.categories[cat.id]}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">{cat.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
