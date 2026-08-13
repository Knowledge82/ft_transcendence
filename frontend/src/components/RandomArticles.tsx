import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRandomArticles } from '../api/articles';
import type { Article } from '../api/articles';
import { ROUTES } from '../routes';
import { Card } from './ui';

export function RandomArticles() {
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
    <Card className="mb-6 text-left">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xs uppercase tracking-wide text-gold-500">
          De la Biblioteca
        </h2>
        <Link to={ROUTES.LIBRARY} className="text-xs text-cream-400 hover:text-cream-100">
          Ver todo
        </Link>
      </div>
      <ul className="space-y-2">
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              to={ROUTES.ARTICLE(article.id)}
              className="text-sm text-cream-100 hover:text-gold-500 hover:underline"
            >
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
