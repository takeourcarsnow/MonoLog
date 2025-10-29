"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/src/lib/api";
import type { Notification } from "@/src/lib/types";
import { AuthRequired } from "@/app/components/AuthRequired";
import { Bell } from "lucide-react";
import Link from "next/link";
import { getPost } from '@/src/lib/api/posts/post';
import { getUser } from '@/src/lib/api/users';
import TimeDisplay from "@/app/components/TimeDisplay";
import NextImage from 'next/image';
import { OptimizedImage } from "@/app/components/OptimizedImage";
import { currentTheme } from "@/src/lib/theme";
import { LoadingIndicator } from "@/app/components/LoadingIndicator";

export default function NotificationsPage() {
  const [loadedNotifications, setLoadedNotifications] = useState<Array<{ notification: Notification; messageData: { message: string; href?: string; imageUrl?: string; actorAvatarUrl?: string } }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme());

  const pageSize = 10; // Load 10 notifications at a time
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  const setSentinel = useCallback((el: HTMLDivElement | null) => {
    if (!el || !hasMore) return;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMoreNotifications();
        }
      });
    }, { rootMargin: '20%' });

    obs.observe(el);

    return () => obs.disconnect();
  }, [hasMore, loadMoreNotifications]);

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
    loadInitialNotifications();
  }, [loadInitialNotifications]);

  useEffect(() => {
    const handleThemeChange = () => setTheme(currentTheme());
    window.addEventListener('theme:changed', handleThemeChange);
    return () => window.removeEventListener('theme:changed', handleThemeChange);
  }, []);

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

  const getNotificationMessage = async (notification: Notification): Promise<{ message: string; href?: string; imageUrl?: string; actorAvatarUrl?: string }> => {
    try {
      // Fetch actor username and avatar
      let actorUsername = 'Someone';
      let actorAvatarUrl: string | undefined = undefined;
      if (notification.actor_id) {
        const actor = await getUser(notification.actor_id);
        if (actor && actor.username) {
          actorUsername = '@' + actor.username;
          actorAvatarUrl = actor.avatarUrl;
        }
      }

      switch (notification.type) {
        case 'comment': {
          let href: string | undefined = undefined;
          let imageUrl: string | undefined = undefined;
          let isOwnPost = false;
          if (notification.post_id) {
            try {
              const p = await getPost(notification.post_id);
              if (p && p.user && (p.user.username || p.user.id)) {
                const userPiece = p.user.username || p.user.id;
                href = `/post/${userPiece}-${p.id.slice(0,8)}`;
              } else {
                href = `/post/${p?.id || notification.post_id}`;
              }
              if (p && p.imageUrls && p.imageUrls.length > 0) {
                imageUrl = p.imageUrls[0];
              }
              // Check if this is the user's own post
              if (p && p.userId) {
                const currentUser = await api.getCurrentUser();
                isOwnPost = !!(currentUser && currentUser.id === p.userId);
              }
            } catch (e) {
              // Fallback to basic post link
              href = `/post/${notification.post_id}`;
            }
          }
          return {
            message: `${actorUsername} commented on ${isOwnPost ? 'your' : 'a'} post${notification.text ? `:\n\n${notification.text.slice(0, 100)}${notification.text.length > 100 ? '...' : ''}` : ''}`,
            href,
            imageUrl,
            actorAvatarUrl
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
            message: `${actorUsername} replied to your thread${notification.text ? `:\n\n${notification.text.slice(0, 100)}${notification.text.length > 100 ? '...' : ''}` : ''}`,
            href,
            actorAvatarUrl
          };
        }
        case 'follow': {
          return { message: `${actorUsername} followed you`, actorAvatarUrl };
        }
        case 'favorite': {
          let href: string | undefined = undefined;
          let imageUrl: string | undefined = undefined;
          let isOwnPost = false;
          if (notification.post_id) {
            try {
              const p = await getPost(notification.post_id);
              if (p && p.user) {
                const userPiece = p.user.username || p.user.id;
                href = `/post/${userPiece}-${p.id.slice(0,8)}`;
              } else {
                href = `/post/${p?.id || notification.post_id}`;
              }
              if (p && p.imageUrls && p.imageUrls.length > 0) {
                imageUrl = p.imageUrls[0];
              }
              // Check if this is the user's own post
              if (p && p.userId) {
                const currentUser = await api.getCurrentUser();
                isOwnPost = !!(currentUser && currentUser.id === p.userId);
              }
            } catch (e) {
              // Fallback to basic post link
              href = `/post/${notification.post_id}`;
            }
          }
          return {
            message: `${actorUsername} favorited ${isOwnPost ? 'your' : 'a'} post`,
            href,
            imageUrl,
            actorAvatarUrl
          };
        }
        default: {
          return { message: `You have a new ${notification.type} notification`, actorAvatarUrl };
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
          <div className="text-center py-12">
            <style>{`
              @keyframes subtleSpin {
                0% { transform: rotate(0deg) scale(1); }
                50% { transform: rotate(180deg) scale(1.1); }
                100% { transform: rotate(360deg) scale(1); }
              }
            `}</style>
            <NextImage src="/logo.svg" alt="loading" width={24} height={24} className="mx-auto" style={{ animation: 'subtleSpin 1.5s infinite', filter: theme === 'light' ? 'invert(1)' : 'none' }} />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 notifications">
        <div className="view-fade">
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
          {loadedNotifications.some(item => !item.notification.read) && (
            <button
              onClick={markAllAsRead}
              className="btn"
            >
              Mark all as read
            </button>
          )}
        </div>

          {loadedNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={48} className="mx-auto mb-4" style={{ color: 'var(--muted)' }} />
              <p style={{ color: 'var(--muted)' }}>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loadedNotifications.map(item => (
                <NotificationItem
                  key={item.notification.id}
                  notification={item.notification}
                  messageData={item.messageData}
                  onMarkAsRead={() => markAsRead([item.notification.id])}
                />
              ))}
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                  {loadingMore ? (
                    <div className="animate-pulse text-sm" style={{ color: 'var(--muted)' }}>
                      Loading more notifications...
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: 'var(--muted)' }}>
                      Scroll for more
                    </div>
                  )}
                </div>
              )}
              {!hasMore && loadedNotifications.length > 0 && (
                <div className="text-center py-4 text-sm" style={{ color: 'var(--muted)' }}>
                  No more notifications
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </AuthRequired>
  );
}

function NotificationItem({
  notification,
  messageData,
  onMarkAsRead
}: {
  notification: Notification;
  messageData: { message: string; href?: string; imageUrl?: string; actorAvatarUrl?: string };
  onMarkAsRead: () => void;
}) {

  return (
    <div
      className="p-4 border rounded-lg"
      style={{
        borderColor: 'var(--border)',
        borderLeftColor: notification.read ? 'var(--border)' : 'var(--primary)',
        borderLeftWidth: notification.read ? '1px' : '4px'
      }}
    >
      <div className="flex flex-col items-center text-center">
        <span style={{ color: 'var(--muted)' }}>
          <TimeDisplay date={notification.created_at} className="text-sm mb-2" />
        </span>
        {messageData?.actorAvatarUrl && (() => {
          const parts = messageData?.message.split(' ') || [];
          const username = parts[0]?.startsWith('@') ? parts[0].slice(1) : null;
          return username ? (
            <div className="mt-3 mb-3">
              <Link href={`/${username}`}>
                <OptimizedImage
                  src={messageData.actorAvatarUrl}
                  alt={`${username}'s avatar`}
                  width={32}
                  height={32}
                  className="rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                  loading="lazy"
                  sizes="32px"
                />
              </Link>
            </div>
          ) : (
            <div className="mt-3 mb-3">
              <OptimizedImage
                src={messageData.actorAvatarUrl}
                alt="User's avatar"
                width={32}
                height={32}
                className="rounded-full"
                loading="lazy"
                sizes="32px"
              />
            </div>
          );
        })()}
        <div className="mb-3" style={{ color: 'var(--text)', whiteSpace: 'pre-line' }}>
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
                  <span>{rest}</span>
                </>
              );
            } else {
              return <p>{messageData?.message}</p>;
            }
          })()}
        </div>
        {messageData?.imageUrl && (
          <div className="mb-3">
            {messageData.href ? (
              <Link href={messageData.href}>
                <img src={messageData.imageUrl} alt="Post image" className="max-w-full h-auto rounded cursor-pointer" style={{ maxHeight: '200px' }} />
              </Link>
            ) : (
              <img src={messageData.imageUrl} alt="Post image" className="max-w-full h-auto rounded" style={{ maxHeight: '200px' }} />
            )}
          </div>
        )}
        {messageData?.href && !messageData?.imageUrl && (
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