import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../api/notifications';
import type { Notification } from '../api/notifications';

export function NotificationBell() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getNotifications(), getUnreadCount()]).then(([list, count]) => {
      setNotifications(list);
      setUnreadCount(count);
    });
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }
    function handleNew(notification: Notification) {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }
    socket.on('notificationCreated', handleNew);
    return () => {
      socket.off('notificationCreated', handleNew);
    };
  }, [socket]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleMarkRead(notification: Notification) {
    if (notification.isRead) {
      return;
    }
    await markNotificationAsRead(notification.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative text-xl text-cream-100 hover:text-gold-500 transition-colors"
        aria-label="Notificaciones"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-error-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-ink-900 border border-ink-800 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center px-3 py-2 border-b border-ink-800">
            <span className="text-xs uppercase tracking-wide text-gold-500">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-cream-400 hover:text-cream-100"
              >
                Marcar todas
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-cream-400 p-3">No tienes notificaciones.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleMarkRead(n)}
                className={`w-full text-left px-3 py-2 border-b border-ink-800 last:border-0 text-sm transition-colors ${
                  n.isRead ? 'text-cream-400' : 'text-cream-100 bg-ink-800/40'
                }`}
              >
                {n.message}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
