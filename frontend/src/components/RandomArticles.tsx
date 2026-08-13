import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRandomArticles } from '../api/articles';
import type { Article } from '../api/articles';
import { ROUTES } from '../routes';

export function RandomArticles() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getRandomArticles(3)
      .then(setArticles)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || articles.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-xs uppercase tracking-wide text-gold-500 mb-3 text-center">
        {t('widgets.libraryTitle')}
      </h2>
      <div className="flex justify-center gap-4">
        {articles.map((article) => (
          <Link
            key={article.id}
            to={ROUTES.ARTICLE(article.id)}
            className="flex flex-col items-center w-24 group"
          >
            <div className="relative w-20 h-20 mb-2">
              {/* The pulsing glow lives on its own layer, behind the
                  scroll image, so the flicker reads as heat radiating
                  from behind the parchment rather than tinting it */}
              <div className="absolute inset-0 rounded-full animate-scroll-glow" />
              <img
                src="/scroll.png"
                alt=""
                className="relative w-full h-full object-contain group-hover:scale-105 transition-transform"
              />
            </div>
            <span className="text-xs text-cream-100 text-center leading-tight group-hover:text-gold-500 transition-colors line-clamp-2">
              {article.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
