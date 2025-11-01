"use client";

import { useEffect, useState, useCallback } from "react";
import Portal from "./Portal";
import { api } from "@/src/lib/api";
import type { Notification } from "@/src/lib/types";
import { Bell, X } from "lucide-react";
import Link from "next/link";
import { getPost } from '@/src/lib/api/posts/post';
import { getUser } from '@/src/lib/api/users';
import { getThread } from '@/src/lib/api/communities/threads';
import TimeDisplay from "./TimeDisplay";
import { OptimizedImage } from "./OptimizedImage";
import { currentTheme } from "@/src/lib/theme";
import { LoadingIndicator } from "@/app/components/LoadingIndicator";
import NextImage from 'next/image';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NotificationsPopup({ open, onClose }: Props) {
  const [loadedNotifications, setLoadedNotifications] = useState<Array<{ notification: Notification; messageData: { message: string; href?: string; imageUrl?: string; actorAvatarUrl?: string } }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme());

  const pageSize = 10;

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
    if (open) {
      loadInitialNotifications();
    }
  }, [open, loadInitialNotifications]);

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
              if (p && p.userId) {
                const currentUser = await api.getCurrentUser();
                isOwnPost = !!(currentUser && currentUser.id === p.userId);
              }
            } catch (e) {
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
          return {
            message: `${actorUsername} replied to your thread${notification.text ? `:\n\n${notification.text.slice(0, 100)}${notification.text.length > 100 ? '...' : ''}` : ''}`,
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
              if (p && p.userId) {
                const currentUser = await api.getCurrentUser();
                isOwnPost = !!(currentUser && currentUser.id === p.userId);
              }
            } catch (e) {
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
        case 'community_created': {
          return {
            message: `${actorUsername} created a new community`,
            actorAvatarUrl
          };
        }
        case 'thread_created': {
          let href: string | undefined = undefined;
          if (notification.thread_id) {
            try {
              const thread = await getThread(notification.thread_id);
              if (thread && thread.community && thread.slug) {
                href = `/communities/${thread.community.slug}/thread/${thread.slug}`;
              }
            } catch (e) {
              href = `/communities/thread/${notification.thread_id}`;
            }
          }
          return {
            message: `${actorUsername} created a new thread: ${notification.text?.replace('Created a new thread: ', '') || 'New thread'}`,
            href,
            actorAvatarUrl
          };
        }
        case 'mention': {
          let href: string | undefined = undefined;
          let imageUrl: string | undefined = undefined;
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
            } catch (e) {
              href = `/post/${notification.post_id}`;
            }
          }
          return {
            message: `${actorUsername} mentioned you in a post`,
            href,
            imageUrl,
            actorAvatarUrl
          };
        }
        case 'post_after_break': {
          let href: string | undefined = undefined;
          let imageUrl: string | undefined = undefined;
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
            } catch (e) {
              href = `/post/${notification.post_id}`;
            }
          }
          return {
            message: `${actorUsername} resumed posting after a break`,
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
      return { message: `You have a new ${notification.type} notification` };
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <div className="notifications-popup-backdrop" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="notifications-popup"
      >
        <div className="notifications-popup-header">
          <h3>Notifications</h3>
          <button onClick={onClose} className="notifications-popup-close" aria-label="Close notifications">
            <X size={20} />
          </button>
        </div>
        <div className="notifications-popup-content">
          {loading ? (
            <div className="text-center py-8">
              <style>{`
                @keyframes subtleSpin {
                  0% { transform: rotate(0deg) scale(1); }
                  50% { transform: rotate(180deg) scale(1.1); }
                  100% { transform: rotate(360deg) scale(1); }
                }
              `}</style>
              <NextImage src="/logo.svg" alt="loading" width={24} height={24} className="mx-auto" style={{ animation: 'subtleSpin 1.5s infinite', filter: theme === 'light' ? 'invert(1)' : 'none' }} />
            </div>
          ) : error ? (
            <div className="text-center py-8" style={{ color: 'var(--danger)' }}>{error}</div>
          ) : loadedNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell size={48} style={{ color: 'var(--muted)' }} />
              <p style={{ color: 'var(--muted)' }}>No notifications yet</p>
            </div>
          ) : (
            <>
              {loadedNotifications.some(item => !item.notification.read) && (
                <div className="notifications-popup-actions">
                  <button onClick={markAllAsRead} className="btn">
                    Mark all as read
                  </button>
                </div>
              )}
              <div className="notifications-popup-list">
                {loadedNotifications.map(item => (
                  <NotificationItem
                    key={item.notification.id}
                    notification={item.notification}
                    messageData={item.messageData}
                    onMarkAsRead={() => markAsRead([item.notification.id])}
                    onClose={onClose}
                  />
                ))}
                {hasMore && (
                  <div ref={setSentinel} className="text-center py-4">
                    {loadingMore ? (
                      <div className="animate-pulse text-sm" style={{ color: 'var(--muted)' }}>
                        Loading more...
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
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}

function NotificationItem({
  notification,
  messageData,
  onMarkAsRead,
  onClose
}: {
  notification: Notification;
  messageData: { message: string; href?: string; imageUrl?: string; actorAvatarUrl?: string };
  onMarkAsRead: () => void;
  onClose: () => void;
}) {
  const handleLinkClick = () => {
    onClose(); // Close the popup when navigating
  };

  return (
    <div
      className="notification-item"
      style={{
        borderColor: 'var(--border)',
        borderLeftColor: notification.read ? 'var(--border)' : 'var(--primary)',
        borderLeftWidth: notification.read ? '1px' : '4px'
      }}
    >
      <div className="notification-content">
        <TimeDisplay date={notification.created_at} className="notification-time" />
        {messageData?.actorAvatarUrl && (() => {
          const parts = messageData?.message.split(' ') || [];
          const username = parts[0]?.startsWith('@') ? parts[0].slice(1) : null;
          return username ? (
            <div className="notification-avatar">
              <Link href={`/${username}`} onClick={handleLinkClick}>
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
            <div className="notification-avatar">
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
        <div className="notification-message">
          {(() => {
            const parts = messageData?.message.split(' ') || [];
            if (parts[0]?.startsWith('@')) {
              const username = parts[0].slice(1);
              const rest = parts.slice(1).join(' ');
              return (
                <>
                  <Link href={`/${username}`} onClick={handleLinkClick} className="hover:underline" style={{ color: 'var(--primary)' }}>
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
          <div className="notification-image">
            {messageData.href ? (
              <Link href={messageData.href} onClick={handleLinkClick}>
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
            onClick={handleLinkClick}
            className="hover:underline text-sm block notification-link"
            style={{ color: 'var(--primary)' }}
          >
            View related content
          </Link>
        )}
        {!notification.read && (
          <button
            onClick={onMarkAsRead}
            className="hover:underline text-sm notification-action"
            style={{ color: 'var(--primary)' }}
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
}