'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type NotificationType = 
  | 'match_starting' 
  | 'prediction_result'
  | 'daily_summary'
  | 'favourite_team'
  | 'odds_alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  matchId?: number;
  actionUrl?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  matchStarting: boolean;
  matchStartMinutes: number;
  predictionResults: boolean;
  dailySummary: boolean;
  favouriteTeam: boolean;
  favouriteTeamIds: number[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const defaultPreferences: NotificationPreferences = {
  enabled: false,
  matchStarting: true,
  matchStartMinutes: 15,
  predictionResults: true,
  dailySummary: true,
  favouriteTeam: false,
  favouriteTeamIds: [],
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

interface NotificationContextType {
  notifications: Notification[];
  preferences: NotificationPreferences;
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  requestPermission: () => Promise<boolean>;
  hasPermission: boolean;
  isSupported: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'xgenius_notifications';
const PREFS_KEY = 'xgenius_notification_prefs';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setHasPermission(Notification.permission === 'granted');
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: Notification) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      }
      
      const storedPrefs = localStorage.getItem(PREFS_KEY);
      if (storedPrefs) {
        setPreferences(JSON.parse(storedPrefs));
      }
    } catch (e) {
      console.error('Failed to load notification data:', e);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  }, [notifications, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  }, [preferences, mounted]);

  const isInQuietHours = useCallback(() => {
    if (!preferences.quietHoursEnabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = preferences.quietHoursStart.split(':').map(Number);
    const [endH, endM] = preferences.quietHoursEnd.split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  }, [preferences.quietHoursEnabled, preferences.quietHoursStart, preferences.quietHoursEnd]);

  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));

    if (preferences.enabled && !isInQuietHours() && hasPermission) {
      showPushNotification(newNotification);
    }
  }, [preferences.enabled, isInQuietHours, hasPermission]);

  const showPushNotification = async (notification: Notification) => {
    if (!isSupported || Notification.permission !== 'granted') return;

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        data: { url: notification.actionUrl || '/' },
      });
    } catch (e) {
      console.error('Failed to show notification:', e);
    }
  };

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      if (granted) {
        updatePreferences({ enabled: true });
      }
      return granted;
    } catch (e) {
      console.error('Failed to request permission:', e);
      return false;
    }
  }, [isSupported, updatePreferences]);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!mounted) {
    return (
      <NotificationContext.Provider
        value={{
          notifications: [],
          preferences: defaultPreferences,
          unreadCount: 0,
          addNotification: () => {},
          markAsRead: () => {},
          markAllAsRead: () => {},
          removeNotification: () => {},
          clearAll: () => {},
          updatePreferences: () => {},
          requestPermission: async () => false,
          hasPermission: false,
          isSupported: false,
        }}
      >
        {children}
      </NotificationContext.Provider>
    );
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        preferences,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        updatePreferences,
        requestPermission,
        hasPermission,
        isSupported,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
