import { useRef, useState } from "react";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileEditForm, ProfileEditFormRef } from "./ProfileEditForm";
import ProfileSocialLinks from "./ProfileSocialLinks";
import { ProfileActions } from "./ProfileActions";
import type { User } from "@/src/lib/types";

interface ProfileHeaderProps {
  user: User;
  currentUserId: string | null;
  isOtherParam: boolean;
  following: boolean | null;
  setFollowing: (following: boolean | null) => void;
  setUser: (user: User | null) => void;
  postCount: number;
  onAvatarChange: () => void;
  // callback when follow is clicked but user is not logged in
  onAuthRequired?: () => void;
  showInvites: boolean;
  setShowInvites: (show: boolean) => void;
}

export function ProfileHeader({ user, currentUserId, isOtherParam, following, setFollowing, setUser, postCount, onAvatarChange, onAuthRequired, showInvites, setShowInvites }: ProfileHeaderProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const editFormRef = useRef<ProfileEditFormRef>(null);

  const handleEditToggle = () => {
    editFormRef.current?.toggleEdit();
  };

  return (
    <div className="profile-header toolbar">
      <div className="profile-left" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", width: "100%" }}>
        <ProfileAvatar user={user} currentUserId={currentUserId} onAvatarChange={onAvatarChange} />
        <div style={{ textAlign: "center", minWidth: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <ProfileEditForm
            ref={editFormRef}
            user={user}
            isEditingProfile={isEditingProfile}
            setIsEditingProfile={setIsEditingProfile}
            setUser={setUser}
            postCount={postCount}
          />
          {/* show social links when not editing */}
          {!isEditingProfile ? <ProfileSocialLinks user={user} /> : null}
        </div>
      </div>
      <ProfileActions
        user={user}
        currentUserId={currentUserId}
        following={following}
        setFollowing={setFollowing}
        isEditingProfile={isEditingProfile}
        onEditToggle={handleEditToggle}
        onAuthRequired={onAuthRequired}
        showInvites={showInvites}
        setShowInvites={setShowInvites}
      />
    </div>
  );
}
