import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import type { User } from "@/lib/types";

interface AvatarImageProps {
  user: User;
  expanded: boolean;
  hasActiveStories: boolean;
}

export function AvatarImage({ user, expanded, hasActiveStories }: AvatarImageProps) {
  return (
    <div
      className={`avatar-wrap ${expanded ? 'avatar-expanded' : ''} ${hasActiveStories ? 'has-stories' : ''}`}
      style={{
        width: 160,
        height: 160,
        // simple scale animation with a tiny opacity fade
        transform: expanded ? 'scale(2.8)' : 'scale(1)',
        opacity: expanded ? 1 : 0.96,
        transition: 'transform 220ms cubic-bezier(.22,.9,.3,1), opacity 200ms ease, box-shadow 220ms ease',
        // expand downward: grow from top center
        transformOrigin: 'top center',
        position: 'relative',
        zIndex: expanded ? 50 : 1,
        overflow: 'visible',
        boxShadow: expanded ? '0 18px 46px rgba(0,0,0,0.42)' : '0 6px 18px rgba(0,0,0,0.12)',
        borderRadius: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <OptimizedImage
        key={user.avatarUrl}
        className={`profile-avatar avatar ${(user.avatarUrl || "/logo.svg") === "/logo.svg" ? 'default-avatar' : ''}`}
        src={user.avatarUrl || "/logo.svg"}
        alt={user.displayName ?? user.username}
        width={160}
        height={160}
        priority
        loading="eager"
        disableLoadingTransition
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9999px', filter: expanded ? 'none' : 'none' }}
      />
    </div>
  );
}