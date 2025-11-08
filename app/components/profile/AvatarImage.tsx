import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import type { User } from "@/lib/types";

interface AvatarImageProps {
  user: User;
  hasActiveStories: boolean;
}

export function AvatarImage({ user, hasActiveStories }: AvatarImageProps) {
  return (
    <div
      className={`avatar-wrap ${hasActiveStories ? 'has-stories' : ''}`}
      style={{
        width: 160,
        height: 160,
        position: 'relative',
        zIndex: 1,
        borderRadius: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
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
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9999px' }}
      />
    </div>
  );
}