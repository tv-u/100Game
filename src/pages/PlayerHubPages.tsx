import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Keyboard, Smartphone, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GameCard } from '../components/GameCard';
import { SeoHeadSync } from '../components/SeoHeadSync';

export const InstructionsPage: React.FC = () => {
  const { lang, t, visibleGames } = useApp();
  const [selectedSlug, setSelectedSlug] = useState(visibleGames[0]?.slug || 'snake');
  const active = visibleGames.find((g) => g.slug === selectedSlug) || visibleGames[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SeoHeadSync
        title={`${t.nav.instructions} | GOO GAME PLAY`}
        description="Complete keyboard and mobile touch instructions for every game on GOO GAME PLAY."
      />
      <div>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t.nav.instructions}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Select a game to inspect its rules, keyboard shortcuts, and mobile touch gestures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-2">
          <select
            aria-label="Choose a game"
            value={active?.slug || selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0D132B] text-sm font-semibold text-slate-900 dark:text-white"
          >
            {visibleGames.map((g) => (
              <option key={g.slug} value={g.slug}>
                #{String(g.number).padStart(2, '0')} · {g.title}
              </option>
            ))}
          </select>
          <div className="hidden lg:flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
            {visibleGames.map((g) => (
              <button
                key={g.slug}
                type="button"
                onClick={() => setSelectedSlug(g.slug)}
                className={`px-3.5 py-2.5 min-h-[40px] rounded-xl text-left text-xs font-semibold transition-colors shrink-0 ${
                  active?.slug === g.slug
                    ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-[#0D132B] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                }`}
              >
                #{String(g.number).padStart(2, '0')} {g.title}
              </button>
            ))}
          </div>
        </div>

        {active && (
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {t.categories[active.category]} · {active.estimatedMinutes}
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{active.title}</h2>
              </div>
              <Link
                to={`/${lang}/games/${active.slug}/`}
                className="min-h-[44px] px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold inline-flex items-center"
              >
                {t.common.playNow}
              </Link>
            </div>

            <div className="space-y-3">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">{t.common.howToPlay}</h3>
              <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
                {active.howToPlay.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-4 space-y-2">
                <div className="font-display text-sm font-bold flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-violet-500" />
                  <span>{t.common.desktopControls}</span>
                </div>
                <ul className="space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {active.desktopControls.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-4 space-y-2">
                <div className="font-display text-sm font-bold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  <span>{t.common.mobileControls}</span>
                </div>
                <ul className="space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {active.mobileControls.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const FavoritesPage: React.FC = () => {
  const { lang, t, favorites, visibleGames } = useApp();
  const favGames = visibleGames.filter((g) => favorites.includes(g.slug));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SeoHeadSync title={`${t.nav.favorites} | GOO GAME PLAY`} description="Your pinned favorite browser mini games." />
      <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t.nav.favorites}</h1>
      {favGames.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-10 text-center space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">{t.sections.favoritesEmpty}</p>
          <Link
            to={`/${lang}/games/`}
            className="inline-flex items-center min-h-[44px] px-6 rounded-xl bg-violet-600 text-white text-sm font-semibold"
          >
            {t.nav.games}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {favGames.map((g) => (
            <GameCard key={g.slug} game={g} />
          ))}
        </div>
      )}
    </div>
  );
};

export const RecentPage: React.FC = () => {
  const { lang, t, recentGames, visibleGames } = useApp();
  const items = recentGames
    .map((r) => visibleGames.find((g) => g.slug === r.slug))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SeoHeadSync title={`${t.nav.recent} | GOO GAME PLAY`} description="Quickly resume your recently played browser games." />
      <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t.nav.recent}</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-10 text-center space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">{t.sections.recentEmpty}</p>
          <Link
            to={`/${lang}/games/`}
            className="inline-flex items-center min-h-[44px] px-6 rounded-xl bg-violet-600 text-white text-sm font-semibold"
          >
            {t.nav.games}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((g) => (
            <GameCard key={g.slug} game={g} />
          ))}
        </div>
      )}
    </div>
  );
};

export const StatsPage: React.FC = () => {
  const { lang, t, stats, visibleGames } = useApp();
  const entries = visibleGames
    .map((g) => ({ game: g, stat: stats[g.slug] }))
    .filter((item) => Boolean(item.stat));

  const totalPlays = entries.reduce((acc, item) => acc + item.stat.plays, 0);
  const highestScore = entries.reduce((acc, item) => Math.max(acc, item.stat.bestScore), 0);
  const totalMinutes = Math.round(entries.reduce((acc, item) => acc + item.stat.totalSeconds, 0) / 60);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SeoHeadSync title={`${t.nav.stats} | GOO GAME PLAY`} description="Anonymous local high scores and play history." />
      <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t.sections.statsTitle}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.sections.totalPlays, value: totalPlays },
          { label: t.sections.gamesTried, value: entries.length },
          { label: t.sections.bestOverall, value: highestScore },
          { label: t.sections.totalMinutes, value: totalMinutes },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</div>
            <div className="font-mono text-3xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{kpi.value}</div>
          </div>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-10 text-center space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">{t.sections.statsEmpty}</p>
          <Link
            to={`/${lang}/games/`}
            className="inline-flex items-center min-h-[44px] px-6 rounded-xl bg-violet-600 text-white text-sm font-semibold"
          >
            {t.nav.games}
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3.5 px-5 font-semibold">Game</th>
                <th className="py-3.5 px-5 font-semibold">Plays</th>
                <th className="py-3.5 px-5 font-semibold">{t.common.bestScore}</th>
                <th className="py-3.5 px-5 font-semibold">Wins</th>
                <th className="py-3.5 px-5 font-semibold">Play</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {entries.map(({ game, stat }) => (
                <tr key={game.slug}>
                  <td className="py-3.5 px-5 font-semibold text-slate-900 dark:text-white">{game.title}</td>
                  <td className="py-3.5 px-5 font-mono tabular-nums">{stat.plays}</td>
                  <td className="py-3.5 px-5 font-mono tabular-nums text-violet-600 dark:text-violet-400 font-bold">
                    {stat.bestScore}
                  </td>
                  <td className="py-3.5 px-5 font-mono tabular-nums">{stat.wins}</td>
                  <td className="py-3.5 px-5">
                    <Link to={`/${lang}/games/${game.slug}/`} className="text-xs font-semibold text-blue-500 hover:underline">
                      {t.common.playNow}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface LeaderboardRow {
  id: string;
  playerName: string;
  score: number;
  mode: string;
  lang: string;
  createdAt: string;
}

export const LeaderboardPage: React.FC = () => {
  const { lang, t, visibleGames } = useApp();
  const [selectedSlug, setSelectedSlug] = useState(visibleGames[0]?.slug || 'snake');
  const [entries, setEntries] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/leaderboard?game=${encodeURIComponent(selectedSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setEntries(Array.isArray(data.entries) ? data.entries : []);
      })
      .catch(() => {
        if (active) setEntries([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedSlug]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <SeoHeadSync
        title={`${t.nav.leaderboard} | GOO GAME PLAY`}
        description="Real player-submitted high scores recorded on GOO GAME PLAY."
      />
      <div>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Trophy className="w-7 h-7 text-amber-400" />
          <span>{t.nav.leaderboard}</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Only real scores submitted directly after completed game rounds appear here.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <select
          aria-label="Filter leaderboard by game"
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0D132B] text-sm font-semibold text-slate-900 dark:text-white"
        >
          {visibleGames.map((g) => (
            <option key={g.slug} value={g.slug}>
              #{String(g.number).padStart(2, '0')} · {g.title}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {visibleGames.slice(0, 12).map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => setSelectedSlug(g.slug)}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedSlug === g.slug
                  ? 'bg-violet-600 text-white'
                  : 'bg-white dark:bg-[#0D132B] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading leaderboard...</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No scores submitted yet for this game. Finish a round and submit your score to set the first real record!
            </p>
            <Link
              to={`/${lang}/games/${selectedSlug}/`}
              className="inline-flex items-center min-h-[44px] px-5 rounded-xl bg-violet-600 text-white text-xs font-semibold"
            >
              {t.common.playNow}
            </Link>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3.5 px-5 font-semibold">#</th>
                <th className="py-3.5 px-5 font-semibold">Player</th>
                <th className="py-3.5 px-5 font-semibold">{t.common.score}</th>
                <th className="py-3.5 px-5 font-semibold">Mode</th>
                <th className="py-3.5 px-5 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {entries.map((row, idx) => (
                <tr key={row.id}>
                  <td className="py-3 px-5 font-mono tabular-nums font-bold">{idx + 1}</td>
                  <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">{row.playerName}</td>
                  <td className="py-3 px-5 font-mono tabular-nums text-violet-600 dark:text-violet-400 font-bold">
                    {row.score}
                  </td>
                  <td className="py-3 px-5 text-xs text-slate-500 dark:text-slate-400">{row.mode}</td>
                  <td className="py-3 px-5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
