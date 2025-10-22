/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useState, useRef, lazy, Suspense } from "react";
import type { HydratedPost } from "@/src/lib/types";
import { AuthForm } from "./AuthForm";
import { UserHeader } from "./postCard/UserHeader";
import { MediaSection } from "./postCard/MediaSection";
import { ActionsSection } from "./postCard/ActionsSection";
import { CommentsSection } from "./postCard/CommentsSection";
import { SpotifySection } from "./postCard/SpotifySection";
import { ExifSection } from "./postCard/ExifSection";
import { EditorWrap } from "./postCard/EditorWrap";
import { usePostState } from "./postCard/hooks/usePostState";
import { useComments } from "./postCard/hooks/useComments";
import { useFavorite } from "./postCard/hooks/useFavorite";
import { useFollow } from "./postCard/hooks/useFollow";
import { useDelete } from "./postCard/hooks/useDelete";
import { useEdit } from "./postCard/hooks/useEdit";
import { useShare } from "./postCard/hooks/useShare";
import { useSpotifyMeta } from "./postCard/hooks/useSpotifyMeta";
import { useEditorAnimation } from "./postCard/hooks/useEditorAnimation";
import { useFullscreen } from "./postCard/hooks/useFullscreen";
import { useCardNavigation } from "./postCard/hooks/useCardNavigation";
import { useIsMe } from "@/src/lib/hooks/useAuth";
import { useToast } from "./Toast";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { CaptionDisplay } from "./postCard/CaptionDisplay";

// Lazy load heavy components
const FullscreenViewer = lazy(() => import("./FullscreenViewer"));
const Editor = lazy(() => import("./postCard/Editor").then(mod => ({ default: mod.Editor })));

// Memoize PostCard to prevent unnecessary re-renders when parent updates
const PostCardComponent = ({ post: initial, allowCarouselTouch, disableMediaNavigation, disableCardNavigation }: { post: HydratedPost; allowCarouselTouch?: boolean; disableMediaNavigation?: boolean; disableCardNavigation?: boolean }) => {
  const { post, setPost } = usePostState(initial);
  const postHref = `/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;
  const imageUrls = (post as any).imageUrls || ((post as any).imageUrl ? [(post as any).imageUrl] : []);
  const isMultipost = imageUrls.length > 1;
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
  // Wrap the toggle so we can include the full post payload in an event
  // This lets list views (like Favorites) append the post immediately
  // without waiting for a full refetch.
  const handleToggleFavoriteWithPost = async () => {
    const success = await toggleFavoriteWithAuth();
    if (success && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monolog:favorite_added', { detail: { post } }));
      } catch (e) {}
    }
    return success;
  };
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
    deleteExpanded,
    setDeleteExpanded,
    showConfirmText,
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
    handleCancel,
    editorOpeningRef
  } = useEdit(post, setPost);
  const { sharePost } = useShare(post);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const spotifyMeta = useSpotifyMeta(post.spotifyLink, post.id);
  const { fsOpen, fsImages, fsCurrentIndex, handleOpenFullscreen, handleCloseFullscreen, handleNextImage, handlePrevImage } = useFullscreen();
  const handleCardClick = useCardNavigation(postHref, editing);
  const { showEditor, editorAnim, opening, editorWrapRef, handleTransitionEnd } = useEditorAnimation(editing);

  const [showAuth, setShowAuth] = useState(false);
  const [showExif, setShowExif] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const pathname = usePathname();
  const { isMe, isLoading: authLoading } = useIsMe(post.userId);
  const followBtnRef = useRef<HTMLButtonElement | null>(null);
  const toast = useToast();

  return (
  <article id={`post-${post.id}`} onClick={disableCardNavigation ? undefined : handleCardClick} className={`card ${isMultipost ? 'multipost' : ''} ${showEditor ? 'editor-open' : ''} ${opening ? 'editor-opening' : ''}${fsOpen ? ' fs-open' : ''}`}>
      <UserHeader
        post={post}
        isMe={isMe}
        authLoading={authLoading}
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
  editorRef={editorRef}
  editorOpeningRef={editorOpeningRef}
        deleteExpanded={deleteExpanded}
        setDeleteExpanded={setDeleteExpanded}
        showConfirmText={showConfirmText}
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
          const success = await handleToggleFavoriteWithPost();
          if (!success) {
            setShowAuth(true);
          }
        }}
        showFavoriteFeedback={showFavoriteFeedback}
        favoriteOverlayState={favoriteOverlayState}
        pathname={pathname}
        disableMediaNavigation={disableMediaNavigation}
        allowCarouselTouch={allowCarouselTouch}
        onImageIndexChange={setCurrentImageIndex}
      />

      <div className="card-body">
        {/* Caption/actions are always rendered but visually hidden when editor is entering.
            This allows the caption/actions to fade/collapse smoothly while the editor
            expands, avoiding a sudden jump on open. */}
  <div className="caption-wrap" aria-hidden={editorAnim === 'enter'}>
          <CaptionDisplay caption={post.caption} />
          <ActionsSection
            postId={post.id}
            count={count}
            commentsOpen={commentsOpen}
            setCommentsOpen={(value: boolean) => {
              setCommentsOpen(value);
              if (value) setShowExif(false); // Close EXIF when opening comments
              if (value) setShowSpotify(false); // Close Spotify when opening comments
            }}
            commentsMounted={commentsMounted}
            setCommentsMounted={setCommentsMounted}
            commentsRef={commentsRef}
            isFavorite={isFavorite}
            setIsFavorite={setIsFavorite}
            toggleFavoriteWithAuth={handleToggleFavoriteWithPost}
            showAuth={showAuth}
            setShowAuth={setShowAuth}
            sharePost={sharePost}
            api={api}
            toast={toast}
            showFavoriteFeedback={showFavoriteFeedback}
            showExif={showExif}
            setShowExif={(value: boolean) => {
              setShowExif(value);
              if (value) {
                setCommentsOpen(false); // Close comments when opening EXIF
                setCommentsMounted(false);
                setShowSpotify(false); // Close Spotify when opening EXIF
              }
            }}
            showSpotify={showSpotify}
            setShowSpotify={(value: boolean) => {
              setShowSpotify(value);
              if (value) {
                setCommentsOpen(false); // Close comments when opening Spotify
                setCommentsMounted(false);
                setShowExif(false); // Close EXIF when opening Spotify
              }
            }}
            spotifyLink={post.spotifyLink}
            camera={post.camera}
            lens={post.lens}
            filmType={post.filmType}
            openFullscreen={() => {
              const imageUrls = (post as any).imageUrls || ((post as any).imageUrl ? [(post as any).imageUrl] : []);
              const alts = Array.isArray(post.alt) ? post.alt : [post.alt || ''];
              const images = imageUrls.map((src: string, index: number) => ({
                src,
                alt: alts[index] || `Photo ${index + 1}`
              }));
              handleOpenFullscreen(images, currentImageIndex);
            }}
          />

          <SpotifySection
            showSpotify={showSpotify}
            spotifyLink={post.spotifyLink}
            spotifyMeta={spotifyMeta}
          />
          <ExifSection
            showExif={showExif}
            camera={post.camera}
            lens={post.lens}
            filmType={post.filmType}
          />
          <CommentsSection
            postId={post.id}
            commentsMounted={commentsMounted}
            commentsOpen={commentsOpen}
            commentsRef={commentsRef}
            setCount={setCount}
          />
        </div>

        <EditorWrap
          showEditor={showEditor}
          editorAnim={editorAnim}
          editorWrapRef={editorWrapRef}
          handleTransitionEnd={handleTransitionEnd}
          editorRef={editorRef}
          post={post}
          handleCancel={handleCancel}
          handleSave={handleSave}
        />
        </div>
      {fsOpen && fsImages.length > 0 && (
        <Suspense fallback={null}>
          <FullscreenViewer 
            images={fsImages} 
            currentIndex={fsCurrentIndex} 
            onClose={handleCloseFullscreen}
            onNext={handleNextImage}
            onPrev={handlePrevImage}
          />
        </Suspense>
      )}
    </article>
  );
}

// Memoize PostCard with shallow comparison to prevent re-renders when posts haven't changed
export const PostCard = memo(PostCardComponent);
