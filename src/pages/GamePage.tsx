import React, { Suspense, lazy, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Keyboard, Smartphone } from 'lucide-react';
import { getGameBySlug } from '../data/games';
import { useApp } from '../context/AppContext';
import { GameShell } from '../components/GameShell';
import { GameCard } from '../components/GameCard';
import { SponsoredBanner } from '../components/SponsoredBanner';
import { SeoHeadSync } from '../components/SeoHeadSync';

const GAME_MODULES: Record<string, React.LazyExoticComponent<React.ComponentType<{ ctx: never; onScoreChange: (score: number) => void }>>> = {
  snake: lazy(() => import('../games/SnakeGame')),
  '2048': lazy(() => import('../games/Game2048')),
  tetris: lazy(() => import('../games/TetrisGame')),
  'flappy-bird': lazy(() => import('../games/FlappyGame')),
  'tic-tac-toe': lazy(() => import('../games/TicTacToeGame')),
  'memory-match': lazy(() => import('../games/MemoryGame')),
  minesweeper: lazy(() => import('../games/MinesweeperGame')),
  breakout: lazy(() => import('../games/BreakoutGame')),
  sudoku: lazy(() => import('../games/SudokuGame')),
  '15-puzzle': lazy(() => import('../games/FifteenPuzzleGame')),
};

export const GamePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t, visibleGames, stats, serverConfig } = useApp();
  const [liveScore, setLiveScore] = useState(0);

  const baseGame = getGameBySlug(slug);
  const localizedGame = visibleGames.find((g) => g.slug === slug) || baseGame;
  const GameComponent = slug ? GAME_MODULES[slug] : undefined;

  if (!localizedGame || !GameComponent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <SeoHeadSync title="Game Not Found | GOO GAME PLAY" description="The requested game could not be found." />
        <h1 className="font-display text-3xl font-bold">Game not found</h1>
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
        <h1 className="font-display text-2xl font-bold">Game temporarily unavailable</h1>
        <Link
          to={`/${lang}/games/`}
          className="inline-flex items-center min-h-[44px] px-6 rounded-xl bg-violet-600 text-white text-sm font-semibold"
        >
          {t.common.backToGames}
        </Link>
      </div>
    );
  }

  const bestScore = Math.max(liveScore, stats[localizedGame.slug]?.bestScore || 0);
  const related = visibleGames.filter((g) => g.slug !== localizedGame.slug).slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-8">
      <SeoHeadSync
        title={override?.seoTitle || localizedGame.seoTitle}
        description={override?.seoDescription || localizedGame.seoDescription}
      />

      {/* Focused Game Arena */}
      <GameShell game={localizedGame} currentScore={liveScore} bestScore={bestScore}>
        {(ctx) => (
          <Suspense
            fallback={
              <div className="w-full py-20 flex flex-col items-center justify-center gap-3 text-sm text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                <span>{t.common.loadingGame}</span>
              </div>
            }
          >
            <GameComponent ctx={ctx as never} onScoreChange={setLiveScore} />
          </Suspense>
        )}
      </GameShell>

      {/* Instructions & Controls below active gameplay */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5 sm:p-6 space-y-3">
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

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5 sm:p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-violet-500" />
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
              <Smartphone className="w-4 h-4 text-blue-500" />
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
