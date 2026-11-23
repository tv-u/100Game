import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';
import { SITE_CONFIG, SUPPORTED_LANGUAGES } from '../config/site';
import { GAME_CATEGORIES } from '../data/games';
import { useApp } from '../context/AppContext';
import { SeoHeadSync } from '../components/SeoHeadSync';

export const AboutPage: React.FC = () => {
  const { lang, t } = useApp();
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <SeoHeadSync title={`${t.legal.aboutTitle} | GOO GAME PLAY`} description="About GOO GAME PLAY international HTML5 gaming platform." />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-7 space-y-4">
          <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">{t.hero.tagline}</div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            {t.legal.aboutTitle}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            GOO GAME PLAY is an instant-access browser gaming arcade designed to deliver an app-like experience on
            smartphones, tablets, and desktop computers without requiring APK downloads or mandatory user registration.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Every title in our catalog is independently built with HTML5 Canvas and responsive web standards, featuring
            touch swipe locks, offline Progressive Web App caching, synthesized Web Audio effects, and support for 22
            languages including full RTL layouts.
          </p>
          <Link
            to={`/${lang}/games/`}
            className="inline-flex items-center min-h-[44px] px-5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
          >
            {t.hero.ctaPrimary}
          </Link>
        </div>
        <div className="md:col-span-5">
          <div className="aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-[#090B12]">
            <img
              src="/src/assets/images/brand_arcade_emblem_1795426211800.jpg"
              alt="GOO GAME PLAY brand emblem"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { lang, t } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send message.');
      } else {
        setSent(true);
        setName('');
        setEmail('');
        setMessage('');
      }
    } catch {
      setError('Network error while sending message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <SeoHeadSync title={`${t.legal.contactTitle} | GOO GAME PLAY`} description="Send feedback or report a game issue to GOO GAME PLAY." />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 space-y-4">
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t.legal.contactTitle}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Have feedback on touch controls, language translations, or want to report a bug? Send a message directly to
            our team.
          </p>
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-4 flex items-center gap-3 text-sm">
            <Mail className="w-5 h-5 text-violet-500 shrink-0" />
            <span className="font-mono text-xs">{SITE_CONFIG.contactEmail}</span>
          </div>
        </div>

        <div className="md:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6">
          {sent ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h2 className="font-display text-xl font-bold">Message Received</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Thank you for contacting GOO GAME PLAY. Your inquiry has been logged for review.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="min-h-[44px] px-5 rounded-xl bg-violet-600 text-white text-xs font-semibold"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" htmlFor="contact-name">
                  Your Name
                </label>
                <input
                  id="contact-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" htmlFor="contact-email">
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" htmlFor="contact-msg">
                  Message
                </label>
                <textarea
                  id="contact-msg"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#090B12] text-sm"
                />
              </div>
              {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="w-full min-h-[46px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const LegalPage: React.FC<{ doc: 'privacy' | 'terms' | 'cookies' | 'disclaimer' }> = ({ doc }) => {
  const { t, lang, serverConfig } = useApp();
  const titles = {
    privacy: t.legal.privacyTitle,
    terms: t.legal.termsTitle,
    cookies: t.legal.cookiesTitle,
    disclaimer: t.legal.disclaimerTitle,
  };

  const sections: Record<typeof doc, Array<{ heading: string; body: string }>> = {
    privacy: [
      {
        heading: 'Anonymous Guest Play',
        body: 'GOO GAME PLAY does not require account registration, names, phone numbers, or passwords to play any of the 10 HTML5 games. Your favorites, recently played list, theme, and high scores remain locally on your device in browser storage.',
      },
      {
        heading: 'Analytics & Error Logging',
        body: 'We record anonymous game start counts (game slug and language code) to understand which games are played most frequently. We do not sell personal data or build cross-site user profiles.',
      },
      {
        heading: 'Third-Party Sponsored Links',
        body: 'If you choose to click an explicitly labeled Monetag sponsored link, it opens in a new browser tab subject to that partner’s privacy policy. You can hide sponsored cards anytime in your settings.',
      },
    ],
    terms: [
      {
        heading: 'Free Browser Access',
        body: 'All games on GOO GAME PLAY are provided free of charge for personal, non-commercial entertainment directly inside supported web browsers.',
      },
      {
        heading: 'Fair Play & Leaderboard Submissions',
        body: 'Community leaderboard entries must reflect genuine gameplay scores. Automated score spamming or abuse of public endpoints may result in entry removal.',
      },
      {
        heading: 'Intellectual Property',
        body: 'All game engines, vector artwork, layout code, and branding on GOO GAME PLAY are original implementations.',
      },
    ],
    cookies: [
      {
        heading: 'Essential Browser Storage',
        body: 'GOO GAME PLAY uses browser localStorage and PWA Cache Storage exclusively to remember your chosen language, light/dark theme, sound/vibration preferences, favorite games, and offline game assets.',
      },
      {
        heading: 'Managing Storage',
        body: 'You may clear site storage or disable browser cookies at any time via your browser settings. Clearing storage will reset your local high scores and preferences.',
      },
    ],
    disclaimer: [
      {
        heading: 'Service Availability',
        body: 'GOO GAME PLAY provides browser games on an "as-is" basis. Offline play requires visiting the platform at least once while online so the PWA service worker can cache game modules.',
      },
      {
        heading: 'Advertising Disclosure',
        body: `Sponsored links (configured via ${serverConfig.settings.monetagDirectLink}) are clearly labeled as advertisements. Clicking a direct link is always optional and never interrupts active gameplay. Direct link integration alone does not automatically guarantee publisher verification or earnings without proper Monetag account configuration.`,
      },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <SeoHeadSync title={`${titles[doc]} | GOO GAME PLAY`} description={`${titles[doc]} for GOO GAME PLAY.`} />
      <div className="border-b border-slate-200 dark:border-white/10 pb-5">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          GOO GAME PLAY · Updated 2026
        </div>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{titles[doc]}</h1>
      </div>

      <div className="space-y-6">
        {sections[doc].map((sec, idx) => (
          <section key={idx} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6 space-y-2">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{sec.heading}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{sec.body}</p>
          </section>
        ))}
      </div>

      <div className="pt-2 text-xs text-slate-500">
        <Link to={`/${lang}/contact/`} className="text-violet-500 hover:underline">
          {t.nav.contact}
        </Link>
      </div>
    </div>
  );
};

export const FaqPage: React.FC = () => {
  const { t } = useApp();
  const faqs = [
    {
      q: 'Do I need to install an APK or create an account to play?',
      a: 'No. Every game launches immediately in Chrome, Safari, Firefox, or Edge on Android, iPhone, Windows, macOS, and Linux without registration.',
    },
    {
      q: 'Can I install GOO GAME PLAY as an app and play offline?',
      a: 'Yes. Tap "Install App" (or Share → Add to Home Screen on iOS Safari) to install our Progressive Web App. Cached games continue working offline.',
    },
    {
      q: 'Why do games pause automatically when I switch apps or tabs?',
      a: 'We listen to browser visibility changes so timers and moving pieces pause automatically whenever you leave the tab, protecting your run.',
    },
    {
      q: 'Do advertisements interrupt gameplay?',
      a: 'Never. Sponsored Monetag links appear only outside active play surfaces with clear labels, and you can hide them anytime.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <SeoHeadSync title={`${t.legal.faqTitle} | GOO GAME PLAY`} description="Frequently asked questions about GOO GAME PLAY." />
      <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t.legal.faqTitle}</h1>
      <div className="space-y-4">
        {faqs.map((item, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-6 space-y-2">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{item.q}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SitemapPage: React.FC = () => {
  const { lang, t, visibleGames } = useApp();
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <SeoHeadSync title={`${t.legal.sitemapTitle} | GOO GAME PLAY`} description="Complete directory of pages, games, categories, and languages." />
      <div>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t.legal.sitemapTitle}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          XML Sitemap Index:{' '}
          <a href="/sitemap.xml" className="text-violet-500 hover:underline font-mono">
            /sitemap.xml
          </a>{' '}
          · Robots:{' '}
          <a href="/robots.txt" className="text-violet-500 hover:underline font-mono">
            /robots.txt
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5 space-y-3">
          <h2 className="font-display text-lg font-bold">All 10 Games</h2>
          <ul className="space-y-2 text-sm">
            {visibleGames.map((g) => (
              <li key={g.slug}>
                <Link to={`/${lang}/games/${g.slug}/`} className="text-violet-600 dark:text-violet-400 hover:underline">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5 space-y-3">
          <h2 className="font-display text-lg font-bold">Platform Pages</h2>
          <ul className="space-y-2 text-sm">
            {[
              { to: `/${lang}/`, label: t.nav.home },
              { to: `/${lang}/games/`, label: t.nav.games },
              { to: `/${lang}/popular/`, label: t.nav.popular },
              { to: `/${lang}/new/`, label: t.nav.newGames },
              { to: `/${lang}/trending/`, label: t.nav.trending },
              { to: `/${lang}/categories/`, label: t.nav.categories },
              ...GAME_CATEGORIES.map((c) => ({ to: `/${lang}/categories/${c.id}/`, label: t.categories[c.id] })),
              { to: `/${lang}/instructions/`, label: t.nav.instructions },
              { to: `/${lang}/favorites/`, label: t.nav.favorites },
              { to: `/${lang}/recent/`, label: t.nav.recent },
              { to: `/${lang}/stats/`, label: t.nav.stats },
              { to: `/${lang}/leaderboard/`, label: t.nav.leaderboard },
              { to: `/${lang}/about/`, label: t.legal.aboutTitle },
              { to: `/${lang}/contact/`, label: t.legal.contactTitle },
              { to: `/${lang}/faq/`, label: t.legal.faqTitle },
              { to: `/${lang}/privacy-policy/`, label: t.legal.privacyTitle },
              { to: `/${lang}/terms/`, label: t.legal.termsTitle },
              { to: `/${lang}/cookie-policy/`, label: t.legal.cookiesTitle },
              { to: `/${lang}/disclaimer/`, label: t.legal.disclaimerTitle },
            ].map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-violet-600 dark:text-violet-400 hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111524] p-5 space-y-3">
          <h2 className="font-display text-lg font-bold">22 Languages</h2>
          <ul className="grid grid-cols-2 gap-2 text-xs">
            {SUPPORTED_LANGUAGES.map((l) => (
              <li key={l.code}>
                <Link to={`/${l.code}/`} className="text-violet-600 dark:text-violet-400 hover:underline">
                  {l.nativeName} ({l.code})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  const { lang, t } = useApp();
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
      <SeoHeadSync title="404 Not Found | GOO GAME PLAY" description="The requested page could not be found." />
      <div className="font-mono text-5xl font-extrabold text-violet-500">404</div>
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Page Not Found</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        The URL you visited does not exist. Jump back into our instant-play arcade below.
      </p>
      <Link
        to={`/${lang}/`}
        className="inline-flex items-center min-h-[44px] px-6 rounded-xl bg-violet-600 text-white text-sm font-semibold"
      >
        {t.nav.home}
      </Link>
    </div>
  );
};
