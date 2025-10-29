"use client";
import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import type { Notification } from "@/src/lib/types";
import { AuthRequired } from "@/app/components/AuthRequired";
import { Bell } from "lucide-react";
import Link from "next/link";
import { getPost } from '@/src/lib/api/posts/post';
import { getUser } from '@/src/lib/api/users';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
      } catch (e: any) {
        setError(e.message || "Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = async (ids: string[]) => {
    try {
      await api.markNotificationsRead(ids);
      setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    } catch (e: any) {
      console.error("Failed to mark notifications as read", e);
    }
  };

  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  const getNotificationMessage = async (notification: Notification): Promise<{ message: string; href?: string }> => {
    try {
      // Fetch actor username
      let actorUsername = 'Someone';
      if (notification.actor_id) {
        const actor = await getUser(notification.actor_id);
        if (actor && actor.username) {
          actorUsername = '@' + actor.username;
        }
      }

      switch (notification.type) {
        case 'comment': {
          let href: string | undefined = undefined;
          if (notification.post_id) {
            try {
              const p = await getPost(notification.post_id);
              if (p && p.user && (p.user.username || p.user.id)) {
                const userPiece = p.user.username || p.user.id;
                href = `/post/${userPiece}-${p.id.slice(0,8)}`;
              } else {
                href = `/post/${p?.id || notification.post_id}`;
              }
            } catch (e) {
              // Fallback to basic post link
              href = `/post/${notification.post_id}`;
            }
          }
          return {
            message: `${actorUsername} commented on your post${notification.text ? `: "${notification.text.slice(0, 100)}${notification.text.length > 100 ? '...' : ''}"` : ''}`,
            href
          };
        }
        case 'thread_reply': {
          let href: string | undefined = undefined;
          // For now, don't try to fetch thread info since getThread may not be implemented
          // if (notification.thread_id) {
          //   try {
          //     const t = await getThread(notification.thread_id);
          //     // ... construct href
          //   } catch (e) {
          //     // ignore
          //   }
          // }
          return {
            message: `${actorUsername} replied to your thread${notification.text ? `: "${notification.text.slice(0, 100)}${notification.text.length > 100 ? '...' : ''}"` : ''}`,
            href
          };
        }
        case 'follow': {
          return { message: `${actorUsername} followed you` };
        }
        case 'favorite': {
          let href: string | undefined = undefined;
          if (notification.post_id) {
            try {
              const p = await getPost(notification.post_id);
              if (p && p.user) {
                const userPiece = p.user.username || p.user.id;
                href = `/post/${userPiece}-${p.id.slice(0,8)}`;
              } else {
                href = `/post/${p?.id || notification.post_id}`;
              }
            } catch (e) {
              // Fallback to basic post link
              href = `/post/${notification.post_id}`;
            }
          }
          return {
            message: `${actorUsername} favorited your post`,
            href
          };
        }
        default: {
          return { message: `You have a new ${notification.type} notification` };
        }
      }
    } catch (e) {
      // Fallback to basic message if fetching additional data fails
      return { message: `You have a new ${notification.type} notification` };
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <div className="view-fade">
          <h1 className="text-2xl font-bold mb-4">Notifications</h1>
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="view-fade">
          <h1 className="text-2xl font-bold mb-4">Notifications</h1>
          <div className="text-center text-red-500">{error}</div>
        </div>
      </main>
    );
  }

  return (
    <AuthRequired>
      <main className="p-6">
        <div className="view-fade">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell size={24} />
              Notifications
            </h1>
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="btn"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => markAsRead([notification.id])}
                  getMessage={getNotificationMessage}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthRequired>
  );
}

function NotificationItem({
  notification,
  onMarkAsRead,
  getMessage
}: {
  notification: Notification;
  onMarkAsRead: () => void;
  getMessage: (notification: Notification) => Promise<{ message: string; href?: string }>;
}) {
  const [messageData, setMessageData] = useState<{ message: string; href?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessage = async () => {
      try {
        const data = await getMessage(notification);
        setMessageData(data);
      } catch (e) {
        setMessageData({ message: `You have a new ${notification.type} notification` });
      } finally {
        setLoading(false);
      }
    };
    loadMessage();
  }, [notification, getMessage]);

  if (loading) {
    return (
      <div className={`p-4 border rounded-lg ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 border rounded-lg ${
        !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">
            {new Date(notification.created_at).toLocaleString()}
          </p>
          <p className="text-gray-900">{messageData?.message}</p>
          {messageData?.href && (
            <Link
              href={messageData.href}
              className="text-blue-600 hover:underline text-sm"
            >
              View related content
            </Link>
          )}
        </div>
        {!notification.read && (
          <button
            onClick={onMarkAsRead}
            className="text-blue-600 hover:underline text-sm ml-4"
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
}