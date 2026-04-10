'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNotifications, Notification } from '@/lib/notificationService';
import { Bell, Check, CheckCheck, X, Settings, Clock, Trophy, Target, TrendingUp } from 'lucide-react';

const typeIcons: Record<string, typeof Bell> = {
  match_starting: Trophy,
  prediction_result: Target,
  daily_summary: TrendingUp,
  favourite_team: Clock,
  odds_alert: Bell,
};

const typeColors: Record<string, string> = {
  match_starting: 'text-orange-400',
  prediction_result: 'text-purple-400',
  daily_summary: 'text-blue-400',
  favourite_team: 'text-green-400',
  odds_alert: 'text-yellow-400',
};

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="p-2">
        <Bell className="w-5 h-5 text-[var(--text-secondary)]" />
      </div>
    );
  }

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getTypeIcon = (type: string) => {
    const Icon = typeIcons[type] || Bell;
    return Icon;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 text-[var(--text-secondary)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[var(--accent-red)] text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[80vh] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
            <h3 className="font-bold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Clear all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[60vh]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30 text-[var(--text-muted)]" />
                <p className="text-[var(--text-muted)]">No notifications yet</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Enable notifications to get match alerts
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {notifications.map((notification) => {
                  const Icon = getTypeIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-[var(--bg-tertiary)] transition-colors ${
                        !notification.read ? 'bg-[var(--accent-blue)]/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${typeColors[notification.type]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-sm font-medium ${!notification.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-xs text-[var(--accent-blue)] hover:underline flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-red)] flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Dismiss
                            </button>
                            {notification.actionUrl && (
                              <Link
                                href={notification.actionUrl}
                                onClick={() => {
                                  markAsRead(notification.id);
                                  setIsOpen(false);
                                }}
                                className="text-xs text-[var(--accent-green)] hover:underline ml-auto"
                              >
                                View
                              </Link>
                            )}
                          </div>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)] flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-[var(--border-color)]">
            <Link
              href="/settings/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 text-sm text-[var(--accent-blue)] hover:underline"
            >
              <Settings className="w-4 h-4" />
              Notification Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
