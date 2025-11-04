import type { User } from "@/lib/types";

interface ProfileStaticViewProps {
  user: User;
  postCount: number;
  currentUserId: string | null;
  onEdit: () => void;
}

export const ProfileStaticView = ({ user, postCount, currentUserId, onEdit }: ProfileStaticViewProps) => {
  const isOwnProfile = currentUserId === user.id;

  return (
    <div className="profile-static-info" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <div
        className="username"
        style={isOwnProfile ? { cursor: 'pointer' } : undefined}
        onClick={isOwnProfile ? onEdit : undefined}
      >
        @{user.username}
      </div>
      {user.displayName && (
        <div
          className="dim"
          style={isOwnProfile ? { cursor: 'pointer' } : undefined}
          onClick={isOwnProfile ? onEdit : undefined}
        >
          {user.displayName}
        </div>
      )}
      <div className="dim">
        {postCount} {postCount === 1 ? 'post' : 'posts'}
      </div>
      {user.bio ? (
        <div
          className="dim profile-bio"
          style={isOwnProfile ? { cursor: 'pointer' } : undefined}
          onClick={isOwnProfile ? onEdit : undefined}
        >
          {user.bio}
        </div>
      ) : null}
    </div>
  );
};