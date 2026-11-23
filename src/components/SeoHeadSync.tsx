import { useEffect } from 'react';
import { SITE_CONFIG } from '../config/site';

interface SeoProps {
  title: string;
  description: string;
}

export const SeoHeadSync: React.FC<SeoProps> = ({ title, description }) => {
  useEffect(() => {
    const fullTitle = title.includes(SITE_CONFIG.brandName)
      ? title
      : `${title} | ${SITE_CONFIG.brandName}`;
    document.title = fullTitle;

    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', description);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && typeof window !== 'undefined') {
      canonical.setAttribute('href', window.location.origin + window.location.pathname);
    }
  }, [title, description]);

  return null;
};
