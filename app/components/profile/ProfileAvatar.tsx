import { useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import { LiveCameraView } from "@/app/components/uploader/LiveCameraView";
import type { User } from "@/lib/types";
import { useAvatarUpload } from "./useAvatarUpload";
import { useStoryUpload } from "./useStoryUpload";
import { useStories } from "./useStories";
import { useStoryViewer } from "./useStoryViewer";
import { AvatarImage } from "./AvatarImage";
import { AvatarActions } from "./AvatarActions";
import { StoryViewerModal } from "./StoryViewerModal";

interface ProfileAvatarProps {
  user: User;
  currentUserId: string | null;
  onAvatarChange: () => void;
}

export function ProfileAvatar({ user, currentUserId, onAvatarChange }: ProfileAvatarProps) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const storyInputRef = useRef<HTMLInputElement | null>(null);
  const avatarContainerRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [showActionButtons, setShowActionButtons] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const { hasActiveStories, setHasActiveStories, ownStories, setOwnStories } = useStories(user.id);
  const { avatarUploading, handleAvatarChange } = useAvatarUpload(currentUserId, onAvatarChange);
  const { storyUploading, handleStoryChangeFromFile, handleLiveCameraCapture } = useStoryUpload(user.id, setHasActiveStories, setOwnStories);

  useStoryViewer(viewerOpen, viewerIdx, ownStories, setViewerIdx, setViewerOpen, setDeleteArmed);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  useEffect(() => {
    if (searchParams.get('changeAvatar') === 'true') {
      setTimeout(() => {
        avatarInputRef.current?.click();
        router.replace('/profile'); // remove the param
      }, 100);
    }
  }, [searchParams, router]);

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
                <div className={`avatar-wrap ${avatarUploading ? 'avatar-uploading' : ''} ${hasActiveStories ? 'has-stories' : ''}`} style={{ width: 160, height: 160, outline: 'none', outlineOffset: 4, borderRadius: 9999, position: 'relative' }}>
                  <OptimizedImage key={user.avatarUrl} className={`profile-avatar avatar ${(user.avatarUrl || "/logo.svg") === "/logo.svg" ? 'default-avatar' : ''}`} src={user.avatarUrl || "/logo.svg"} alt={user.displayName ?? user.username} width={160} height={160} priority loading="eager" disableLoadingTransition style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9999px' }} />
                  {!hasActiveStories && !showActionButtons && (
                    <div className="camera-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                      📷
                    </div>
                  )}
                </div>
              </button>
            </div>
            {showActionButtons && !hasActiveStories && (
              <AvatarActions
                storyUploading={storyUploading}
                onLiveCamera={() => setShowLiveCamera(true)}
                onFileUpload={() => storyInputRef.current?.click()}
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
            aria-label={`Toggle ${(user.displayName ?? user.username)}'s avatar`}
            className="profile-avatar-button"
            onClick={() => setExpanded((s) => !s)}
            aria-expanded={expanded}
            style={{ background: 'none', border: 'none', padding: 0, cursor: expanded ? 'zoom-out' : 'zoom-in' }}
          >
            <AvatarImage user={user} expanded={expanded} hasActiveStories={hasActiveStories} />
          </button>
        </>
      )}
      <LiveCameraView
        isOpen={showLiveCamera}
        onClose={() => setShowLiveCamera(false)}
        onCapture={handleLiveCameraCapture}
        processing={false}
      />
      <StoryViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        stories={ownStories}
        currentIndex={viewerIdx}
        onPrev={onPrev}
        onNext={onNext}
        deleteArmed={deleteArmed}
        setDeleteArmed={setDeleteArmed}
        onLiveCamera={() => setShowLiveCamera(true)}
        user={user}
        setStories={setOwnStories}
        setHasActiveStories={setHasActiveStories}
      />
    </>
  );
}
