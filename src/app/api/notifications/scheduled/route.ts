import { NextResponse } from 'next/server';

const STORAGE_KEY = 'xgenius_scheduled_notifications';

interface ScheduledNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  scheduledTime: string;
  matchId?: number;
  actionUrl?: string;
}

function getScheduledNotifications(): ScheduledNotification[] {
  if (typeof global.localStorage === 'undefined') return [];
  try {
    const stored = global.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveScheduledNotifications(notifications: ScheduledNotification[]) {
  if (typeof global.localStorage === 'undefined') return;
  global.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export async function GET() {
  try {
    const notifications = getScheduledNotifications();
    const now = new Date();
    
    const upcoming = notifications
      .filter(n => new Date(n.scheduledTime) > now)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

    return NextResponse.json(upcoming);
  } catch (error) {
    console.error('Error fetching scheduled notifications:', error);
    return NextResponse.json([], { status: 500 });
  }
}
