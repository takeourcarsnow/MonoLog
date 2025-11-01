import { useRef } from "react";
import type { User } from "@/src/lib/types";
import { SocialLinksFields } from "./SocialLinksFields";

interface ProfileEditFieldsProps {
  user: User;
  editDisplayName: string;
  setEditDisplayName: (value: string) => void;
  editUsername: string;
  setEditUsername: (value: string) => void;
  editBio: string;
  setEditBio: (value: string) => void;
  editTwitter: string;
  setEditTwitter: (value: string) => void;
  editInstagram: string;
  setEditInstagram: (value: string) => void;
  editSpotify: string;
  setEditSpotify: (value: string) => void;
  editFacebook: string;
  setEditFacebook: (value: string) => void;
  editWebsite: string;
  setEditWebsite: (value: string) => void;
  usernameRef: React.RefObject<HTMLInputElement>;
}

export const ProfileEditFields = ({
  user,
  editDisplayName,
  setEditDisplayName,
  editUsername,
  setEditUsername,
  editBio,
  setEditBio,
  editTwitter,
  setEditTwitter,
  editInstagram,
  setEditInstagram,
  editSpotify,
  setEditSpotify,
  editFacebook,
  setEditFacebook,
  editWebsite,
  setEditWebsite,
  usernameRef,
}: ProfileEditFieldsProps) => {
  const displayNameRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <label className="label-group">
        <div className="muted-label sr-only">@Username</div>
        <div className="input-container">
          <input
            ref={usernameRef}
            className="input"
            placeholder="@Username"
            value={editUsername}
            onChange={e => setEditUsername(e.target.value)}
          />
          {editUsername !== user.username && (() => {
            if (!user.usernameChangedAt) {
              return <div className="input-indicator" title="You can only change your username once every 24 hours">⚠️ Once every 24h</div>;
            }
            const lastChanged = new Date(user.usernameChangedAt).getTime();
            const hoursSince = (Date.now() - lastChanged) / (1000 * 60 * 60);
            if (hoursSince < 24) {
              const hoursRemaining = Math.ceil(24 - hoursSince);
              return <div className="input-indicator" title="You can only change your username once every 24 hours">🔒 {hoursRemaining}h</div>;
            } else {
              return <div className="input-indicator" title="You can only change your username once every 24 hours">⚠️ Once every 24h</div>;
            }
          })()}
        </div>
      </label>

      <label className="label-group">
        <div className="muted-label sr-only">Display name</div>
        <input
          ref={displayNameRef}
          className="input"
          placeholder="Name (optional)"
          value={editDisplayName}
          onChange={e => setEditDisplayName(e.target.value)}
        />
      </label>

      <label className="bio-col label-group">
        <div className="muted-label sr-only">Bio</div>
        <div className="bio-editor-container">
          <textarea
            className="bio-editor"
            placeholder="Tell people about yourself"
            value={editBio}
            maxLength={200}
            onChange={e => setEditBio(e.target.value.slice(0, 200))}
            aria-label="Profile bio"
          />
          <div className="bio-char-count" aria-live="polite">{editBio.length}/200</div>
        </div>
      </label>

      <SocialLinksFields
        editTwitter={editTwitter}
        setEditTwitter={setEditTwitter}
        editInstagram={editInstagram}
        setEditInstagram={setEditInstagram}
        editSpotify={editSpotify}
        setEditSpotify={setEditSpotify}
        editFacebook={editFacebook}
        setEditFacebook={setEditFacebook}
        editWebsite={editWebsite}
        setEditWebsite={setEditWebsite}
      />
    </>
  );
};