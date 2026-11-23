import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LeaderboardSubmitWidget: React.FC<{
  gameSlug: string;
  score: number;
  mode?: string;
}> = ({ gameSlug, score, mode = 'Standard' }) => {
  const { lang, t } = useApp();
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (score <= 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameSlug,
          playerName: name.trim() || 'Guest Player',
          score,
          mode,
          lang,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // Ignore offline submission failure
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
        <Trophy className="w-4 h-4" />
        <span>{t.common.scoreSubmitted}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <input
        type="text"
        maxLength={24}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.common.playerNamePlaceholder}
        className="h-10 px-3 rounded-xl border border-white/15 bg-black/40 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <button
        type="submit"
        disabled={submitting}
        className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
      >
        {t.common.submitScore}
      </button>
    </form>
  );
};
