import { useRef, useState, useEffect } from "react";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import type { User } from "@/lib/types";
import { useAvatarUpload } from "./useAvatarUpload";
import { useStoryUpload } from "./useStoryUpload";
import { useStories } from "./useStories";
import { useStoryViewer } from "./useStoryViewer";
import { AvatarImage } from "./AvatarImage";
import { AvatarActions } from "./AvatarActions";
import { Camera } from 'lucide-react';
import { StoryViewerModal } from "./StoryViewerModal";
import { PublicStoryViewerModal } from "./PublicStoryViewerModal";
import { useCameraContext } from "@/app/components/context/CameraContext";

interface ProfileAvatarProps {
  user: User;
  currentUserId: string | null;
  onAvatarChange: () => void;
  triggerAvatar: boolean;
  setTriggerAvatar: (trigger: boolean) => void;
}

export function ProfileAvatar({ user, currentUserId, onAvatarChange, triggerAvatar, setTriggerAvatar }: ProfileAvatarProps) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const storyInputRef = useRef<HTMLInputElement | null>(null);
  const avatarContainerRef = useRef<HTMLDivElement | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);
  const [showActionButtons, setShowActionButtons] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const { setIsCameraOpen, setCaptureCallback } = useCameraContext();

  const { hasActiveStories, setHasActiveStories, ownStories, setOwnStories } = useStories(user.id);
  const { avatarUploading, handleAvatarChange } = useAvatarUpload(currentUserId, onAvatarChange);
  const { storyUploading, handleStoryChangeFromFile, handleLiveCameraCapture } = useStoryUpload(user.id, setHasActiveStories, setOwnStories);

  useStoryViewer(viewerOpen, viewerIdx, ownStories, setViewerIdx, setViewerOpen, setDeleteArmed);

  useEffect(() => {
    if (triggerAvatar) {
      avatarInputRef.current?.click();
      setTriggerAvatar(false);
    }
  }, [triggerAvatar, setTriggerAvatar]);

  // Hide action buttons when clicking outside
  useEffect(() => {
    if (!showActionButtons) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (avatarContainerRef.current && !avatarContainerRef.current.contains(event.target as Node)) {
        setShowActionButtons(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showActionButtons]);

  const handleStoryChange = async () => {
    const f = storyInputRef.current?.files?.[0];
    if (!f) return;
    await handleStoryChangeFromFile(f);
  };

  const onPrev = () => setViewerIdx(v => v === 0 ? ownStories.length - 1 : v - 1);
  const onNext = () => setViewerIdx(v => (v + 1) % ownStories.length);

  const onPublicPrev = () => setViewerIdx(v => Math.max(v - 1, 0));
  const onPublicNext = () => {
    if (viewerIdx + 1 >= ownStories.length) {
      setViewerOpen(false);
    } else {
      setViewerIdx(v => v + 1);
    }
  };

  return (
    <>
      {currentUserId && user?.id === currentUserId ? (
        <>
          <div className="avatar-container" ref={avatarContainerRef} style={{ position: 'relative', display: 'inline-block' }}>
            <div className="avatar-section">
              <button
                className="avatar-button"
                aria-label={hasActiveStories ? "View your stories" : "Avatar"}
                onClick={() => {
                  if (hasActiveStories) {
                    setViewerOpen(true);
                    setViewerIdx(0);
                  } else {
                    setShowActionButtons(prev => !prev);
                  }
                }}
                disabled={avatarUploading}
                aria-busy={avatarUploading}
                type="button"
              >
                <div className={`avatar-wrap ${avatarUploading ? 'avatar-uploading' : ''} ${hasActiveStories ? 'has-stories' : ''} ${(showActionButtons && !hasActiveStories) ? 'camera-visible' : ''}`} style={{ width: 160, height: 160, outline: 'none', outlineOffset: 4, borderRadius: 9999, position: 'relative' }}>
                  {(() => {
                    const isCameraVisible = showActionButtons && !hasActiveStories;
                    const avatarStyle: React.CSSProperties = {
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '9999px',
                      ...(isCameraVisible ? { filter: 'blur(4px)', opacity: 0.92, transition: 'filter 180ms ease, opacity 180ms ease' } : {}),
                    };
                    return (
                      <OptimizedImage key={user.avatarUrl} className={`profile-avatar avatar ${(user.avatarUrl || "/logo.svg") === "/logo.svg" ? 'default-avatar' : ''} ${isCameraVisible ? 'camera-blur' : ''}`} src={user.avatarUrl || "/logo.svg"} alt={user.displayName ?? user.username} width={160} height={160} priority loading="eager" disableLoadingTransition style={avatarStyle} />
                    );
                  })()}
                  {!hasActiveStories && !showActionButtons && (
                    <div className="camera-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <Camera size={28} strokeWidth={2} />
                    </div>
                  )}
                </div>
              </button>
            </div>
            {showActionButtons && !hasActiveStories && (
                <AvatarActions
                  storyUploading={storyUploading}
                  onLiveCamera={() => {
                    setCaptureCallback(() => handleLiveCameraCapture);
                    setIsCameraOpen(true);
                  }}
                />
            )}
          </div>
          <input type="file" accept="image/*" ref={avatarInputRef} style={{ display: 'none' }} onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAvatarChange(file);
          }} disabled={avatarUploading} />
          <input type="file" accept="image/*,video/*" ref={storyInputRef} style={{ display: 'none' }} onChange={handleStoryChange} />
        </>
      ) : (
        <>
          <button
            type="button"
            aria-label={hasActiveStories ? `View ${user.displayName ?? user.username}'s stories` : `${user.displayName ?? user.username}'s avatar`}
            className="profile-avatar-button"
            onClick={() => {
              if (hasActiveStories) {
                setViewerOpen(true);
                setViewerIdx(0);
              }
            }}
            style={{ background: 'none', border: 'none', padding: 0, cursor: hasActiveStories ? 'pointer' : 'default' }}
          >
            <AvatarImage user={user} hasActiveStories={hasActiveStories} />
          </button>
        </>
      )}
      {currentUserId && user?.id === currentUserId ? (
          <StoryViewerModal
            isOpen={viewerOpen}
            onClose={() => setViewerOpen(false)}
            stories={ownStories}
            currentIndex={viewerIdx}
            onPrev={onPrev}
            onNext={onNext}
            deleteArmed={deleteArmed}
            setDeleteArmed={setDeleteArmed}
            onLiveCamera={() => {
              setCaptureCallback(() => handleLiveCameraCapture);
              setIsCameraOpen(true);
            }}
            user={user}
            setStories={setOwnStories}
            setHasActiveStories={setHasActiveStories}
          />
      ) : (
        <PublicStoryViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          stories={ownStories}
          currentIndex={viewerIdx}
          onPrev={onPublicPrev}
          onNext={onPublicNext}
          user={user}
        />
      )}
    </>
  );
}
