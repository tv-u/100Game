import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { LANGUAGE_CODES } from './config/site';
import { AppProvider, useApp } from './context/AppContext';
import { ControlProvider } from './controls/ControlContext';
import { detectBrowserLanguage } from './i18n/detectLanguage';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AllGamesPage, CategoriesPage, CollectionPage } from './pages/CatalogPages';
import { GamePage } from './pages/GamePage';
import { FavoritesPage, InstructionsPage, LeaderboardPage, RecentPage, StatsPage } from './pages/PlayerHubPages';
import { AboutPage, ContactPage, FaqPage, LegalPage, NotFoundPage, SitemapPage } from './pages/EditorialPages';
import { AdminPage } from './pages/AdminPage';

const LocalizedShell: React.FC = () => {
  const { lang: routeLang } = useParams<{ lang: string }>();
  const { setLang } = useApp();

  const normalized = (routeLang || '').toLowerCase();
  const isValidLang = LANGUAGE_CODES.includes(normalized);

  useEffect(() => {
    if (isValidLang) {
      setLang(normalized);
    }
  }, [isValidLang, normalized, setLang]);

  if (!isValidLang) {
    return (
      <Layout>
        <NotFoundPage />
      </Layout>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="games" element={<AllGamesPage />} />
        <Route path="games/:slug" element={<GamePage />} />
        <Route path="popular" element={<CollectionPage mode="popular" />} />
        <Route path="new" element={<CollectionPage mode="new" />} />
        <Route path="trending" element={<CollectionPage mode="trending" />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/:categoryId" element={<CategoriesPage />} />
        <Route path="instructions" element={<InstructionsPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="recent" element={<RecentPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy-policy" element={<LegalPage doc="privacy" />} />
        <Route path="terms" element={<LegalPage doc="terms" />} />
        <Route path="cookie-policy" element={<LegalPage doc="cookies" />} />
        <Route path="disclaimer" element={<LegalPage doc="disclaimer" />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="sitemap" element={<SitemapPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
};

const RootRedirect: React.FC = () => {
  const detected = detectBrowserLanguage();
  return <Navigate to={`/${detected}/`} replace />;
};

export default function App() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (!event.message) return;
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: event.message,
          source: event.filename || 'window',
          path: window.location.pathname,
        }),
      }).catch(() => {});
    };
    window.addEventListener('error', onError);
    return () => window.removeEventListener('error', onError);
  }, []);

  return (
    <BrowserRouter>
      <AppProvider initialLang={detectBrowserLanguage()}>
        <ControlProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/admin/*" element={<Navigate to="/en/admin/" replace />} />
            <Route path="/:lang/*" element={<LocalizedShell />} />
            <Route
              path="*"
              element={
                <Layout>
                  <NotFoundPage />
                </Layout>
              }
            />
          </Routes>
        </ControlProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
