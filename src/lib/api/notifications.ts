import { getClient, getAccessToken } from "./client";
import type { Notification } from "../types";

export async function getNotifications(options?: { limit?: number; before?: string }): Promise<Notification[]> {
  try {
    const sb = getClient();
    const token = await getAccessToken(sb);
    if (!token) {
      throw new Error('No access token available. Please sign in.');
    }

    const resp = await fetch('/api/notifications/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(options || {}),
    });
    if (!resp.ok) {
      throw new Error(`Failed to fetch notifications: ${resp.status}`);
    }
    const data = await resp.json();
    return data.notifications || [];
  } catch (e) {
    console.error('Error fetching notifications:', e);
    throw e;
  }
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  try {
    const sb = getClient();
    const token = await getAccessToken(sb);
    if (!token) {
      throw new Error('No access token available. Please sign in.');
    }

    const resp = await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: notificationIds }),
    });
    if (!resp.ok) {
      throw new Error(`Failed to mark notifications as read: ${resp.status}`);
    }
  } catch (e) {
    console.error('Error marking notifications as read:', e);
    throw e;
  }
}