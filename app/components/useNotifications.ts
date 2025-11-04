"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { getNotificationMessage } from "./notificationMessageUtils";

export function useNotifications(pageSize: number = 10) {
  const [loadedNotifications, setLoadedNotifications] = useState<Array<{ notification: Notification; messageData: { message: string; href?: string; imageUrl?: string; actorAvatarUrl?: string } }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const notifs = await api.getNotifications({ limit: pageSize });
      const loaded = await Promise.all(notifs.map(async (notification) => {
        try {
          const messageData = await getNotificationMessage(notification);
          return { notification, messageData };
        } catch (e) {
          return { notification, messageData: { message: `You have a new ${notification.type} notification` } };
        }
      }));
      setLoadedNotifications(loaded);
      setHasMore(notifs.length === pageSize);
    } catch (e: any) {
      setError(e.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const loadMoreNotifications = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      const last = loadedNotifications[loadedNotifications.length - 1];
      const before = last?.notification.created_at;
      const next = await api.getNotifications({ limit: pageSize, before });
      const loaded = await Promise.all(next.map(async (notification) => {
        try {
          const messageData = await getNotificationMessage(notification);
          return { notification, messageData };
        } catch (e) {
          return { notification, messageData: { message: `You have a new ${notification.type} notification` } };
        }
      }));
      setLoadedNotifications(prev => [...prev, ...loaded]);
      setHasMore(next.length === pageSize);
    } catch (e: any) {
      setError(e instanceof Error ? e.message : "Failed to load more notifications");
    } finally {
      setLoadingMore(false);
    }
  }, [loadedNotifications, loadingMore, hasMore, pageSize]);

  const markAsRead = async (ids: string[]) => {
    try {
      await api.markNotificationsRead(ids);
      setLoadedNotifications(prev => prev.map(item => ids.includes(item.notification.id) ? { ...item, notification: { ...item.notification, read: true } } : item));
    } catch (e: any) {
      console.error("Failed to mark notifications as read", e);
    }
  };

  const markAllAsRead = () => {
    const unreadIds = loadedNotifications.filter(item => !item.notification.read).map(item => item.notification.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  return {
    loadedNotifications,
    loading,
    loadingMore,
    hasMore,
    error,
    loadInitialNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
  };
}