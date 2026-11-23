import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({ variant = 'compact' }) => {
  const { t } = useApp();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
          variant === 'full' ? 'w-full px-5 py-3 text-sm min-h-[44px]' : 'px-3.5 py-2 text-xs min-h-[40px]'
        }`}
      >
        <Download className="w-4 h-4" />
        <span>{t.common.installApp}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 font-medium transition-colors whitespace-nowrap shrink-0 ${
            variant === 'full' ? 'w-full px-5 py-3 text-sm min-h-[44px]' : 'px-3.5 py-2 text-xs min-h-[40px]'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>{t.common.installIOS}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111524] border border-slate-200 dark:border-white/10 p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {t.common.installIOS}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
                <li>Tap the <strong>Share</strong> icon in the Safari toolbar.</li>
                <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
                <li>Launch <strong>GOO PLAY</strong> from your home screen in fullscreen app mode.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
