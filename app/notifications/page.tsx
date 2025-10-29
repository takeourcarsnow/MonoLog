"use client";
import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import type { Notification } from "@/src/lib/types";
import { AuthRequired } from "@/app/components/AuthRequired";
import { Bell } from "lucide-react";
import Link from "next/link";
import { getPost } from '@/src/lib/api/posts/post';
import { getUser } from '@/src/lib/api/users';
import TimeDisplay from "@/app/components/TimeDisplay";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Add body class for scrolling
    document.body.classList.add('notifications-page-scroll');
    document.documentElement.classList.add('notifications-page-scroll');

    return () => {
      // Clean up on unmount
      document.body.classList.remove('notifications-page-scroll');
      document.documentElement.classList.remove('notifications-page-scroll');
    };
  }, []);

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
      <main className="p-6 notifications">
        <div className="view-fade">
          <h1 className="text-2xl font-bold mb-4">Notifications</h1>
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elev)' }}>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" style={{ backgroundColor: 'var(--muted)' }}></div>
                <div className="h-3 bg-gray-200 rounded w-1/2" style={{ backgroundColor: 'var(--muted)' }}></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 notifications">
        <div className="view-fade">
          <h1 className="text-2xl font-bold mb-4">Notifications</h1>
          <div className="text-center" style={{ color: 'var(--danger)' }}>{error}</div>
        </div>
      </main>
    );
  }

  return (
    <AuthRequired>
      <main className="p-6 notifications">
        <div className="view-fade">
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
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
              <Bell size={48} className="mx-auto mb-4" style={{ color: 'var(--muted)' }} />
              <p style={{ color: 'var(--muted)' }}>No notifications yet</p>
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
      <div className="p-4 border rounded-lg animate-pulse" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elev)' }}>
        <div className="flex flex-col items-center text-center">
          <div className="h-4 rounded w-3/4 mb-2" style={{ backgroundColor: 'var(--muted)' }}></div>
          <div className="h-4 rounded w-1/2 mb-2" style={{ backgroundColor: 'var(--muted)' }}></div>
          <div className="h-3 rounded w-2/3" style={{ backgroundColor: 'var(--muted)' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-4 border rounded-lg"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: notification.read ? 'var(--bg-elev)' : 'color-mix(in srgb, var(--primary), transparent 95%)',
        borderLeftColor: notification.read ? 'var(--border)' : 'var(--primary)',
        borderLeftWidth: notification.read ? '1px' : '4px'
      }}
    >
      <div className="flex flex-col items-center text-center">
        <span style={{ color: 'var(--muted)' }}>
          <TimeDisplay date={notification.created_at} className="text-sm mb-2" />
        </span>
        <div className="mb-3" style={{ color: 'var(--text)' }}>
          {(() => {
            const parts = messageData?.message.split(' ') || [];
            if (parts[0]?.startsWith('@')) {
              const username = parts[0].slice(1);
              const rest = parts.slice(1).join(' ');
              return (
                <>
                  <Link href={`/${username}`} className="hover:underline" style={{ color: 'var(--primary)' }}>
                    {parts[0]}
                  </Link>{' '}
                  {rest}
                </>
              );
            } else {
              return <p>{messageData?.message}</p>;
            }
          })()}
        </div>
        {messageData?.href && (
          <Link
            href={messageData.href}
            className="hover:underline text-sm mb-3 block"
            style={{ color: 'var(--primary)' }}
          >
            View related content
          </Link>
        )}
        {!notification.read && (
          <button
            onClick={onMarkAsRead}
            className="hover:underline text-sm"
            style={{ color: 'var(--primary)' }}
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
}