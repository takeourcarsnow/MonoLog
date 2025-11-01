import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import type { FormEvent } from 'react';
import { useProfileEdit } from "./useProfileEdit";
import { ProfileStaticView } from "./ProfileStaticView";
import { ProfileEditFields } from "./ProfileEditFields";
import { ProfileEditFormActions } from "./ProfileEditFormActions";
import type { User } from "@/src/lib/types";

interface ProfileEditFormProps {
  user: User;
  isEditingProfile: boolean;
  setIsEditingProfile: (editing: boolean) => void;
  setUser: (user: User | null) => void;
  postCount: number;
  currentUserId: string | null;
}

export interface ProfileEditFormRef {
  toggleEdit: () => void;
}

export const ProfileEditForm = forwardRef<ProfileEditFormRef, ProfileEditFormProps>(
  ({ user, isEditingProfile, setIsEditingProfile, setUser, postCount, currentUserId }, ref) => {
    const [isClosing, setIsClosing] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    const {
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
      editProcessing,
      usernameRef,
      saveEdits,
      toggleEdit: saveAndToggle,
      startEditing,
    } = useProfileEdit(user, setUser, setIsEditingProfile);

    const toggleEdit = async () => {
      if (isEditingProfile) {
        await saveAndToggle();
      } else {
        startEditing();
      }
    };

    // close edit panel on Escape for accessibility
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isEditingProfile) {
          setIsEditingProfile(false);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [isEditingProfile, setIsEditingProfile]);

    useEffect(() => {
      if (isEditingProfile && !isClosing) {
        requestAnimationFrame(() => setAnimateIn(true));
      } else {
        setAnimateIn(false);
      }
    }, [isEditingProfile, isClosing]);

    useImperativeHandle(ref, () => ({ toggleEdit }));

    const handleSave = async (e?: FormEvent) => {
      e?.preventDefault();
      await saveEdits();
      setIsClosing(true);
      setTimeout(() => {
        setIsEditingProfile(false);
        setIsClosing(false);
      }, 200);
    };

    const handleCancel = () => {
      setIsEditingProfile(false);
    };

    return (
      <>
        {!isEditingProfile && !isClosing && (
          <ProfileStaticView
            user={user}
            postCount={postCount}
            currentUserId={currentUserId}
            onEdit={startEditing}
          />
        )}
        {(isEditingProfile || isClosing) && (
          <form
            className={`inline-edit-card ${animateIn && !isClosing ? 'visible' : isClosing ? 'closing' : ''}`}
            style={{ width: '100%', maxWidth: 720 }}
            onSubmit={handleSave}
          >
            <style>{`
              .account-options-dropdown {
                margin-top: 16px;
                border: 1px solid var(--border);
                border-radius: 8px;
                background: var(--card-bg);
              }
              .account-options-summary {
                padding: 12px 16px;
                cursor: pointer;
                user-select: none;
                font-weight: 500;
                color: var(--text);
                background: none;
                border: none;
                width: 100%;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .account-options-dropdown > div {
                padding: 12px 16px;
                border-top: 1px solid var(--border);
              }
            `}</style>
            <ProfileEditFields
              user={user}
              editDisplayName={editDisplayName}
              setEditDisplayName={setEditDisplayName}
              editUsername={editUsername}
              setEditUsername={setEditUsername}
              editBio={editBio}
              setEditBio={setEditBio}
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
              usernameRef={usernameRef}
            />
            <ProfileEditFormActions
              editProcessing={editProcessing}
              onCancel={handleCancel}
              onSave={handleSave}
            />
          </form>
        )}
      </>
    );
  }
);
ProfileEditForm.displayName = 'ProfileEditForm';
