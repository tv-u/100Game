import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { GameCatalogItem } from '../data/games';
import { GameArtwork } from './GameArtwork';

const NEON_CYCLE = [
  'dark:neon-card-purple',
  'dark:neon-card-emerald',
  'dark:neon-card-cyan',
  'dark:neon-card-gold',
  'dark:neon-card-coral',
];

export const GameCard: React.FC<{ game: GameCatalogItem; variant?: 'default' | 'quick' }> = ({
  game,
  variant = 'default',
}) => {
  const { lang, t, isFavorite, toggleFavorite, stats, serverConfig } = useApp();
  const fav = isFavorite(game.slug);
  const localBest = stats[game.slug]?.bestScore || 0;
  const globalPlays = serverConfig.playsByGame?.[game.slug] || 0;
  const categoryLabel = t.categories[game.category];
  const neonClass = NEON_CYCLE[(game.number - 1) % NEON_CYCLE.length];

  if (variant === 'quick') {
    return (
      <Link
        to={`/${lang}/games/${game.slug}/`}
        className={`group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 dark:bg-[#0C1228] border border-slate-200 dark:border-white/10 ${neonClass} transition-transform duration-200 hover:-translate-y-1 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
      >
        <GameArtwork slug={game.slug} className="transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/35 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <div className="font-display text-sm font-bold text-white leading-tight line-clamp-2">{game.title}</div>
          <div className="mt-1 text-[11px] text-cyan-300/90 font-medium truncate">
            {categoryLabel}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article
      className={`group flex flex-col rounded-2xl bg-white dark:bg-[#0D132B] border border-slate-200 dark:border-white/10 ${neonClass} overflow-hidden transition-transform duration-200 hover:-translate-y-0.5`}
    >
      <Link
        to={`/${lang}/games/${game.slug}/`}
        className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <GameArtwork slug={game.slug} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050816]/90 via-black/15 to-transparent pointer-events-none" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-xs text-slate-200">
          <span className="font-medium truncate">
            {categoryLabel} <span aria-hidden="true">·</span> {game.difficulty}
          </span>
          {localBest > 0 && (
            <span className="font-mono tabular-nums text-cyan-300 font-semibold">
              {t.common.bestScore}: {localBest}
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/${lang}/games/${game.slug}/`}
              className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white hover:text-cyan-400 transition-colors"
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

          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
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
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 shadow-[0_0_16px_rgba(56,189,248,0.35)] transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {t.common.playNow}
          </Link>
        </div>
      </div>
    </article>
  );
};
