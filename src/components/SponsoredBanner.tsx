import React from 'react';
import { ExternalLink, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SponsoredBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t, prefs, toggleAds, serverConfig } = useApp();
  const { adsEnabled, monetagDirectLink, adsDisclosure } = serverConfig.settings;

  if (!adsEnabled || !monetagDirectLink) return null;

  if (!prefs.adsEnabled) {
    return (
      <div className={`rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.02] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
        <span>{t.common.adsDisabledNote}</span>
        <button
          type="button"
          onClick={toggleAds}
          className="font-semibold text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap"
        >
          {t.common.enableAds}
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label={t.common.sponsoredLabel}
      className={`rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="space-y-1">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {adsDisclosure || t.common.sponsoredLabel} · Monetag
        </div>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          {t.common.supportFreeGames}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          {t.common.supportDescription}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={monetagDirectLink}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <span>{t.common.visitPartner}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          type="button"
          onClick={toggleAds}
          title={t.common.disableAds}
          aria-label={t.common.disableAds}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
