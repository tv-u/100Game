import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { GameCatalogItem } from '../data/games';
import { GameArtwork } from './GameArtwork';

export const GameCard: React.FC<{ game: GameCatalogItem }> = ({ game }) => {
  const { lang, t, isFavorite, toggleFavorite, stats, serverConfig } = useApp();
  const fav = isFavorite(game.slug);
  const localBest = stats[game.slug]?.bestScore || 0;
  const globalPlays = serverConfig.playsByGame?.[game.slug] || 0;
  const categoryLabel = t.categories[game.category];

  return (
    <article className="group flex flex-col rounded-2xl bg-white dark:bg-[#111524] border border-slate-200 dark:border-white/10 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <Link
        to={`/${lang}/games/${game.slug}/`}
        className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <GameArtwork slug={game.slug} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-xs text-slate-200">
          <span className="font-medium truncate">
            {categoryLabel} <span aria-hidden="true">·</span> {game.estimatedMinutes}
          </span>
          {localBest > 0 && (
            <span className="font-mono tabular-nums text-white/90">
              {t.common.bestScore}: {localBest}
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 gap-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/${lang}/games/${game.slug}/`}
              className="font-display text-lg font-bold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              {game.title}
            </Link>
            <button
              type="button"
              onClick={() => toggleFavorite(game.slug)}
              aria-label={fav ? t.common.unfavorite : t.common.favorite}
              className="min-h-[44px] min-w-[44px] -mt-2 -mr-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Heart className={`w-5 h-5 ${fav ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>

          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {game.shortDescription}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {game.controlsType}
            {globalPlays > 0 ? ` · ${globalPlays} plays` : ''}
          </span>
          <Link
            to={`/${lang}/games/${game.slug}/`}
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {t.common.playNow}
          </Link>
        </div>
      </div>
    </article>
  );
};
