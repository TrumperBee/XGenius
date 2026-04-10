'use client';

import { useEffect, useRef } from 'react';
import { useNotifications, NotificationType } from '@/lib/notificationService';

interface ScheduledNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  scheduledTime: Date;
  matchId?: number;
  actionUrl?: string;
}

export function useNotificationScheduler() {
  const { addNotification, preferences } = useNotifications();
  const scheduledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!preferences.enabled) return;

    const checkScheduledNotifications = async () => {
      try {
        const response = await fetch('/api/notifications/scheduled');
        if (response.ok) {
          const scheduled: ScheduledNotification[] = await response.json();
          
          const now = new Date();
          scheduled.forEach((notification) => {
            const key = `${notification.id}`;
            if (!scheduledRef.current.has(key) && new Date(notification.scheduledTime) <= now) {
              addNotification({
                type: notification.type,
                title: notification.title,
                message: notification.message,
                matchId: notification.matchId,
                actionUrl: notification.actionUrl,
              });
              scheduledRef.current.add(key);
            }
          });
        }
      } catch (e) {
        console.error('Failed to check scheduled notifications:', e);
      }
    };

    const interval = setInterval(checkScheduledNotifications, 60000);
    checkScheduledNotifications();

    return () => clearInterval(interval);
  }, [preferences.enabled, addNotification]);
}

export async function scheduleMatchReminder(
  matchId: number,
  matchName: string,
  kickoffTime: Date
) {
  const reminderTimes = [15, 30, 60];
  
  for (const minutes of reminderTimes) {
    const reminderTime = new Date(kickoffTime.getTime() - minutes * 60000);
    if (reminderTime > new Date()) {
      try {
        await fetch('/api/notifications/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `${matchId}_${minutes}`,
            type: 'match_starting',
            title: 'Match Starting Soon',
            message: `${matchName} kicks off in ${minutes} minutes`,
            scheduledTime: reminderTime.toISOString(),
            matchId,
            actionUrl: `/match/${matchId}`,
          }),
        });
      } catch (e) {
        console.error('Failed to schedule reminder:', e);
      }
    }
  }
}
