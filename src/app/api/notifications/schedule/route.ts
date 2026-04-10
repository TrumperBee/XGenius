import { NextRequest, NextResponse } from 'next/server';

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

const scheduledNotifications: ScheduledNotification[] = [];

function getScheduledNotifications(): ScheduledNotification[] {
  return scheduledNotifications;
}

function saveScheduledNotifications(notifications: ScheduledNotification[]) {
  scheduledNotifications.length = 0;
  scheduledNotifications.push(...notifications);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, title, message, scheduledTime, matchId, actionUrl } = body;

    if (!id || !type || !title || !message || !scheduledTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const notifications = getScheduledNotifications();
    const existing = notifications.findIndex(n => n.id === id);
    
    const notification: ScheduledNotification = {
      id,
      type,
      title,
      message,
      scheduledTime,
      matchId,
      actionUrl,
    };

    if (existing >= 0) {
      notifications[existing] = notification;
    } else {
      notifications.push(notification);
    }

    saveScheduledNotifications(notifications);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return NextResponse.json(
      { error: 'Failed to schedule notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing notification ID' },
        { status: 400 }
      );
    }

    const notifications = getScheduledNotifications();
    const filtered = notifications.filter(n => n.id !== id);
    saveScheduledNotifications(filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scheduled notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
