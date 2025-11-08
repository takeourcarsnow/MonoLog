import Link from "next/link";
import TimeDisplay from "@/app/components/ui/TimeDisplay";
import { Clock } from 'lucide-react';
import { StoryAvatar } from "@/app/components/ui/StoryAvatar";
import type { Notification } from "@/lib/types";

function NotificationItem({
  notification,
  messageData,
  onClose
}: {
  notification: Notification;
  messageData: { message: string; href?: string; imageUrl?: string; actorAvatarUrl?: string; actorHasStory?: boolean };
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
        <span className="inline-flex items-center gap-2 notification-time"><Clock size={12} className="mr-1" />{"\u00A0"}<TimeDisplay date={notification.created_at} className="notification-time" /></span>
        {messageData?.actorAvatarUrl && (() => {
          const parts = messageData?.message.split(' ') || [];
          const username = parts[0]?.startsWith('@') ? parts[0].slice(1) : undefined;
          return (
            <div className="notification-avatar">
              <StoryAvatar
                src={messageData.actorAvatarUrl}
                alt={username ? `${username}'s avatar` : "User's avatar"}
                username={username}
                hasStory={messageData.actorHasStory}
                size={32}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                href={username ? `/${username}` : undefined}
                onClick={username ? handleLinkClick : undefined}
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