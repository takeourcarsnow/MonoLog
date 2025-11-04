"use client";

import { useEffect, useState, useCallback } from "react";
import Portal from "@/app/components/ui/Portal";
import { Bell, X } from "lucide-react";
import { currentTheme } from "@/lib/theme";
import { LoadingIndicator } from "@/app/components/ui/LoadingIndicator";
import NextImage from 'next/image';
import { useNotifications } from "@/app/components/notifications/useNotifications";
import { api } from "@/lib/api";
import NotificationItem from "@/app/components/notifications/NotificationItem";
import { SpinningLogo } from "@/app/components/ui/SpinningLogo";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NotificationsPopup({ open, onClose }: Props) {
  const { me } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme());
  const pageSize = 10;

  const {
    loadedNotifications,
    loading,
    loadingMore,
    hasMore,
    error,
    loadInitialNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications(pageSize, me);

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

  // On open: immediately mark all notifications read on the server (one-shot)
  useEffect(() => {
    if (!open || !me) return;
    try {
      const anyApi: any = api as any;
      anyApi.markAllNotificationsRead?.()
        .then(() => {
          try {
            window.dispatchEvent(new CustomEvent('monolog:notifications_marked_all_read', { detail: { source: 'popup-open-instant' } }));
          } catch (_) {}
        })
        .catch(() => {});
    } catch (_) {}
  }, [open, me]);

  useEffect(() => {
    if (open) {
      loadInitialNotifications();
    }
  }, [open, loadInitialNotifications]);

  // After list loads, mark currently loaded items as read in UI
  useEffect(() => {
    if (!open || !me) return;
    if (loading) return;
    const hasUnread = loadedNotifications.some(n => !n.notification.read);
    if (hasUnread) {
      // Local UI: mark the currently loaded page as read immediately for responsiveness
      markAllAsRead();
    }
  }, [open, me, loading, loadedNotifications, markAllAsRead]);

  useEffect(() => {
    const handleThemeChange = () => setTheme(currentTheme());
    window.addEventListener('theme:changed', handleThemeChange);
    return () => window.removeEventListener('theme:changed', handleThemeChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.classList.add('notifications-popup-open');
    } else {
      document.body.classList.remove('notifications-popup-open');
    }
    return () => {
      document.body.classList.remove('notifications-popup-open');
    };
  }, [open]);

  if (!open) return null;

  return (
    <Portal wrapperId="notifications-root" className="notifications-portal">
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
          {!me ? (
            <div className="text-center py-8 notifications-empty-state">
              <Bell size={48} style={{ color: 'var(--muted)', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 8px 0' }}>Stay Connected</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px 0', maxWidth: 320 }}>Sign in to get notified about likes, comments, mentions, and more.</p>
              <Link href="/explore" onClick={onClose} className="btn">Explore posts</Link>
            </div>
          ) : loading ? (
            <div className="text-center py-8" style={{ paddingTop: '60px' }}>
              <SpinningLogo invertInLight={theme === 'light'} />
            </div>
          ) : error ? (
            <div className="text-center py-8" style={{ color: 'var(--danger)' }}>{error}</div>
          ) : loadedNotifications.length === 0 ? (
            <div className="text-center py-8 notifications-empty-state">
              <Bell size={48} style={{ color: 'var(--muted)' }} />
              <p style={{ color: 'var(--muted)' }}>No notifications yet</p>
            </div>
          ) : (
            <>
              {/* Removed "Mark all as read" button per UI update */}
              <div className="notifications-popup-list">
                {loadedNotifications.map(item => (
                  <NotificationItem
                    key={item.notification.id}
                    notification={item.notification}
                    messageData={item.messageData}
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