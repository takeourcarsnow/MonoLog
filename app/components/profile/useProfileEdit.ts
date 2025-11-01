import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useToast } from "../Toast";
import type { User } from "@/src/lib/types";
import { validateUsername, normalizeDisplayName, normalizeBio, normalizeSocialLinks } from "./profileUtils";

export const useProfileEdit = (
  user: User,
  setUser: (user: User | null) => void,
  setIsEditingProfile: (editing: boolean) => void
) => {
  const router = useRouter();
  const toast = useToast();

  const usernameRef = useRef<HTMLInputElement | null>(null);

  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editTwitter, setEditTwitter] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [editSpotify, setEditSpotify] = useState("");
  const [editFacebook, setEditFacebook] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editProcessing, setEditProcessing] = useState(false);

  const saveEdits = async (e?: React.FormEvent) => {
    e?.preventDefault?.();

    const validationError = validateUsername(editUsername);
    if (validationError) {
      toast.show(validationError);
      return;
    }

    const oldUsername = user.username;
    const usernameChanged = oldUsername && editUsername !== oldUsername;

    setEditProcessing(true);
    try {
      const socialLinks = normalizeSocialLinks({
        twitter: editTwitter,
        instagram: editInstagram,
        spotify: editSpotify,
        facebook: editFacebook,
        website: editWebsite,
      });

      const displayNameNormalized = normalizeDisplayName(editDisplayName);
      const bioNormalized = normalizeBio(editBio);

      const payload: any = {
        displayName: displayNameNormalized,
        bio: bioNormalized,
        socialLinks,
      };
      if (usernameChanged) {
        payload.username = editUsername;
      }

      const updatedUser = await api.updateCurrentUser(payload as Partial<User>);
      setUser(updatedUser);

      try {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('auth:changed'));
      } catch (_) {}
      try {
        router.refresh?.();
      } catch (_) {}

      setIsEditingProfile(false);

      if (usernameChanged && oldUsername && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath.includes(`/${oldUsername}`)) {
          router.push(`/${editUsername}`);
        }
      }
    } catch (e: any) {
      console.error('[ProfileEditForm] saveEdits error', e);
      toast.show(e?.message || 'Failed to update profile');
    } finally {
      setEditProcessing(false);
    }
  };

  const initializeEditState = () => {
    setEditDisplayName(user.displayName && user.displayName !== user.username ? user.displayName : "");
    setEditUsername(user.username || "");
    setEditBio((user.bio || "").slice(0, 200));
    setEditTwitter(user.socialLinks?.twitter || "");
    setEditInstagram(user.socialLinks?.instagram || "");
    setEditSpotify(user.socialLinks?.spotify || "");
    setEditFacebook(user.socialLinks?.facebook || "");
    setEditWebsite(user.socialLinks?.website || "");
  };

  const toggleEdit = async () => {
    if (!editProcessing) {
      await saveEdits();
    }
  };

  const startEditing = () => {
    initializeEditState();
    setIsEditingProfile(true);
    requestAnimationFrame(() => {
      usernameRef.current?.focus?.();
    });
  };

  return {
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
    toggleEdit,
    startEditing,
  };
};