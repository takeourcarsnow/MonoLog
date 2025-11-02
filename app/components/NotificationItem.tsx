import Link from "next/link";
import TimeDisplay from "./TimeDisplay";
import { OptimizedImage } from "./OptimizedImage";
import type { Notification } from "@/src/lib/types";

function NotificationItem({
  notification,
  messageData,
  onClose
}: {
  notification: Notification;
  messageData: { message: string; href?: string; imageUrl?: string; actorAvatarUrl?: string };
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
        {/* Per-notification "Mark as read" action removed per UI update */}
      </div>
    </div>
  );
}

export default NotificationItem;