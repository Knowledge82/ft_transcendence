import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../context/SocketContext';
import { getTodayCommunityFeed } from '../api/community';
import type { CommunityEvent } from '../api/community';
import { Card } from './ui';
import { getGenderedRole } from '../utils/genderedRole';

const CYCLE_MS = 7000;
const FADE_MS = 1500;

const TYPE_TO_NAMESPACE: Record<string, string> = {
  USER_REGISTERED: 'userRegistered',
  ROLE_CHANGED: 'roleChanged',
  FRIENDSHIP_ACCEPTED: 'friendshipAccepted',
  FRIENDSHIP_BROKEN: 'friendshipBroken',
  ARTICLE_PUBLISHED: 'articlePublished',
  ARTICLE_EDITED: 'articleEdited',
  ARTICLE_DELETED: 'articleDeleted',
  FICTIONAL_STATIC: 'fictionalStatic',
  USER_EXECUTED: 'userExecuted',
  ORGANIZATION_FOUNDED: 'organizationFounded',
  ORGANIZATION_DISSOLVED: 'organizationDissolved',
  ORGANIZATION_JOINED: 'organizationJoined',
  ORGANIZATION_ARTICLE_PUBLISHED: 'organizationArticlePublished',
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function renderMessage(message: string) {
  const parts = message.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={i} className="text-gold-500 font-bold">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ActivityTicker() {
  const { t, i18n } = useTranslation();
  const { socket } = useSocket();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    getTodayCommunityFeed().then((data) => setEvents(shuffle(data)));
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }
    function handleNewEvent(event: CommunityEvent) {
      setEvents((prev) => [...prev, event]);
    }
    socket.on('communityEventCreated', handleNewEvent);
    return () => {
      socket.off('communityEventCreated', handleNewEvent);
    };
  }, [socket]);

  useEffect(() => {
    if (events.length === 0) {
      return;
    }
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % events.length);
        setVisible(true);
      }, FADE_MS);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, [events.length]);

  const current = events[index % events.length];

  function renderEvent(event: CommunityEvent): string {
    if (event.type === 'FICTIONAL_AI') {
      const params = event.params ?? {};
      return params[i18n.language] ?? params.es ?? '';
    }

    const namespace = TYPE_TO_NAMESPACE[event.type];
    if (!namespace || event.templateIndex === null) {
      return '';
    }

    const params: Record<string, string> = { ...(event.params ?? {}) };
    if (event.type === 'ROLE_CHANGED' && params.role && params.gender) {
      params.role = getGenderedRole(params.role, params.gender, i18n.language);
    }

    return t(`community.${namespace}.${event.templateIndex}`, params);
  }

  return (
    <Card className="mb-6 text-center min-h-[96px] flex flex-col items-center justify-center">
      <h2 className="text-xs uppercase tracking-wide text-gold-500 mb-3">
        {t('widgets.activityTitle')}
      </h2>
      {current ? (
        <p
          className={`text-sm text-cream-100 max-w-md transition-opacity ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        >
          {renderMessage(renderEvent(current))}
        </p>
      ) : (
        <p className="text-sm text-cream-400">{t('widgets.activityEmpty')}</p>
      )}
    </Card>
  );
}
