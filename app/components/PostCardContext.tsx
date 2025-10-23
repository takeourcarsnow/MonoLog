import { createContext, useContext, ReactNode } from "react";
import type { HydratedPost } from "@/src/lib/types";

interface PostCardState {
  post: HydratedPost;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  editorAnim: 'enter' | 'exit' | null;
  showEditor: boolean;
  editorWrapRef: React.RefObject<HTMLDivElement>;
  handleTransitionEnd: (e: React.TransitionEvent) => void;
  editorRef: React.RefObject<any>;
  handleCancel: () => void;
  handleSave: (patch: any) => Promise<void>;
  commentsOpen: boolean;
  setCommentsOpen: (value: boolean) => void;
  commentsMounted: boolean;
  setCommentsMounted: (value: boolean) => void;
  commentsRef: React.RefObject<HTMLDivElement>;
  count: number;
  setCount: (count: number) => void;
  isFavorite: boolean;
  setIsFavorite: (favorite: boolean) => void;
  toggleFavoriteWithAuth: () => Promise<boolean>;
  showAuth: boolean;
  setShowAuth: (show: boolean) => void;
  sharePost: () => void;
  api: any;
  toast: any;
  showFavoriteFeedback: (action: 'adding' | 'removing') => void;
  showExif: boolean;
  setShowExif: (show: boolean) => void;
  showSpotify: boolean;
  setShowSpotify: (show: boolean) => void;
  spotifyLink?: string;
  camera?: string;
  lens?: string;
  filmType?: string;
  openFullscreen: () => void;
  spotifyMeta: any;
  fsOpen: boolean;
  fsImages: any[];
  fsCurrentIndex: number;
  handleCloseFullscreen: () => void;
  handleNextImage: () => void;
  handlePrevImage: () => void;
  currentImageIndex: number;
  setCurrentImageIndex: (index: number) => void;
  isMe: boolean;
  authLoading: boolean;
  isFollowing: boolean;
  setIsFollowing: (following: boolean) => void;
  showFavoriteOverlayState: 'adding' | 'removing' | null;
  followAnim: boolean;
  setFollowAnim: (anim: boolean) => void;
  followExpanded: boolean;
  setFollowExpanded: (expanded: boolean) => void;
  followExpandTimerRef: React.RefObject<any>;
  followAnimTimerRef: React.RefObject<any>;
  followInFlightRef: React.RefObject<any>;
  toggleFollow: () => void;
  deleteExpanded: boolean;
  setDeleteExpanded: (expanded: boolean) => void;
  showConfirmText: boolean;
  deleteExpandTimerRef: React.RefObject<any>;
  isPressingDelete: boolean;
  setIsPressingDelete: (pressing: boolean) => void;
  overlayEnabled: boolean;
  setOverlayEnabled: (enabled: boolean) => void;
  deleteBtnRef: React.RefObject<HTMLButtonElement>;
  deleteHandlerRef: React.RefObject<any>;
  handleDeleteActivation: () => void;
  editExpanded: boolean;
  setEditExpanded: (expanded: boolean) => void;
  editTimerRef: React.RefObject<any>;
  editorSaving: boolean;
  editorOpeningRef: React.RefObject<any>;
  pathname: string;
  followBtnRef: React.RefObject<HTMLButtonElement>;
}

const PostCardContext = createContext<PostCardState | null>(null);

export function PostCardProvider({
  children,
  value
}: {
  children: ReactNode;
  value: PostCardState;
}) {
  return (
    <PostCardContext.Provider value={value}>
      {children}
    </PostCardContext.Provider>
  );
}

export function usePostCardState() {
  const context = useContext(PostCardContext);
  if (!context) {
    throw new Error('usePostCardState must be used within a PostCardProvider');
  }
  return context;
}