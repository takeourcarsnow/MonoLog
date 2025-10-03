/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useState, useRef } from "react";
import type { HydratedPost } from "@/lib/types";
import { AuthForm } from "./AuthForm";
import { UserHeader } from "./postCard/UserHeader";
import { MediaSection } from "./postCard/MediaSection";
import { ActionsSection } from "./postCard/ActionsSection";
import { CommentsSection } from "./postCard/CommentsSection";
import { Editor } from "./postCard/Editor";
import { usePostState } from "./postCard/hooks/usePostState";
import { useComments } from "./postCard/hooks/useComments";
import { useFavorite } from "./postCard/hooks/useFavorite";
import { useFollow } from "./postCard/hooks/useFollow";
import { useDelete } from "./postCard/hooks/useDelete";
import { useEdit } from "./postCard/hooks/useEdit";
import { useShare } from "./postCard/hooks/useShare";
import { useIsMe } from "./postCard/hooks/useAuth";
import { useToast } from "./Toast";
import { usePathname } from "next/navigation";

// Memoize PostCard to prevent unnecessary re-renders when parent updates
const PostCardComponent = ({ post: initial, allowCarouselTouch }: { post: HydratedPost; allowCarouselTouch?: boolean }) => {
  const { post, setPost } = usePostState(initial);
  const {
    commentsOpen,
    setCommentsOpen,
    commentsMounted,
    setCommentsMounted,
    commentsRef,
    count,
    setCount
  } = useComments(post.id, initial.commentsCount || 0);
  const {
    isFavorite,
    setIsFavorite,
    favoriteOverlayState,
    toggleFavoriteWithAuth,
    showFavoriteFeedback
  } = useFavorite(post.id);
  const {
    isFollowing,
    setIsFollowing,
    followAnim,
    setFollowAnim,
    followExpanded,
    setFollowExpanded,
    followExpandTimerRef,
    followAnimTimerRef,
    followInFlightRef,
    toggleFollow
  } = useFollow(post.userId);
  const {
    confirming,
    deleteExpanded,
    setDeleteExpanded,
    deleteExpandTimerRef,
    isPressingDelete,
    setIsPressingDelete,
    overlayEnabled,
    setOverlayEnabled,
    deleteBtnRef,
    deleteHandlerRef,
    handleDeleteActivation
  } = useDelete(post.id);
  const {
    editing,
    setEditing,
    editExpanded,
    setEditExpanded,
    editTimerRef,
    editorSaving,
    editorRef,
    handleSave,
    handleCancel
  } = useEdit(post, setPost);
  const { sharePost } = useShare(post);

  const [showAuth, setShowAuth] = useState(false);
  const pathname = usePathname();
  const isMe = useIsMe(post.userId);
  const followBtnRef = useRef<HTMLButtonElement | null>(null);
  const toast = useToast();

  return (
    <article className="card">
      <UserHeader
        post={post}
        isMe={isMe}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
        showAuth={showAuth}
        setShowAuth={setShowAuth}
        editing={editing}
        setEditing={setEditing}
        editExpanded={editExpanded}
        setEditExpanded={setEditExpanded}
        editTimerRef={editTimerRef}
        editorSaving={editorSaving}
        confirming={confirming}
        deleteExpanded={deleteExpanded}
        setDeleteExpanded={setDeleteExpanded}
        deleteExpandTimerRef={deleteExpandTimerRef}
        isPressingDelete={isPressingDelete}
        setIsPressingDelete={setIsPressingDelete}
        overlayEnabled={overlayEnabled}
        setOverlayEnabled={setOverlayEnabled}
        deleteBtnRef={deleteBtnRef}
        deleteHandlerRef={deleteHandlerRef}
        followBtnRef={followBtnRef}
        followAnim={followAnim}
        setFollowAnim={setFollowAnim}
        followExpanded={followExpanded}
        setFollowExpanded={setFollowExpanded}
        followExpandTimerRef={followExpandTimerRef}
        followAnimTimerRef={followAnimTimerRef}
        followInFlightRef={followInFlightRef}
        toast={toast}
      />

      <MediaSection
        post={post}
        isFavorite={isFavorite}
        toggleFavoriteWithAuth={async () => {
          const success = await toggleFavoriteWithAuth();
          if (success) {
            showFavoriteFeedback(isFavorite ? 'removing' : 'adding');
          } else {
            setShowAuth(true);
          }
        }}
        showFavoriteFeedback={showFavoriteFeedback}
        favoriteOverlayState={favoriteOverlayState}
        pathname={pathname}
        allowCarouselTouch={allowCarouselTouch}
      />

      <div className="card-body">
        {!editing ? (
          <>
            {post.caption ? <div className="caption">{post.caption}</div> : null}
            <ActionsSection
              postId={post.id}
              count={count}
              commentsOpen={commentsOpen}
              setCommentsOpen={setCommentsOpen}
              commentsMounted={commentsMounted}
              setCommentsMounted={setCommentsMounted}
              commentsRef={commentsRef}
              isFavorite={isFavorite}
              setIsFavorite={setIsFavorite}
              showAuth={showAuth}
              setShowAuth={setShowAuth}
              sharePost={sharePost}
              api={null}
              toast={null}
            />
            <CommentsSection
              postId={post.id}
              commentsMounted={commentsMounted}
              commentsOpen={commentsOpen}
              commentsRef={commentsRef}
              setCount={setCount}
            />
          </>
        ) : (
          <Editor
            ref={editorRef}
            post={post}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        )}
      </div>
    </article>
  );
}

// Memoize PostCard with shallow comparison to prevent re-renders when posts haven't changed
export const PostCard = memo(PostCardComponent, (prev, next) => {
  // Only re-render if post ID or allowCarouselTouch changes
  return prev.post.id === next.post.id && 
         prev.allowCarouselTouch === next.allowCarouselTouch &&
         prev.post.caption === next.post.caption &&
         prev.post.public === next.post.public &&
         prev.post.commentsCount === next.post.commentsCount;
});