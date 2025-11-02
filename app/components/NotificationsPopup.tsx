"use client";

import { useEffect, useState, useCallback } from "react";
import Portal from "./Portal";
import { Bell, X } from "lucide-react";
import { currentTheme } from "@/src/lib/theme";
import { LoadingIndicator } from "@/app/components/LoadingIndicator";
import NextImage from 'next/image';
import { useNotifications } from "./useNotifications";
import NotificationItem from "./NotificationItem";
import { SpinningLogo } from "./SpinningLogo";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NotificationsPopup({ open, onClose }: Props) {
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
  } = useNotifications(pageSize);

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
          {loading ? (
            <div className="text-center py-8">
              <SpinningLogo invertInLight={theme === 'light'} />
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