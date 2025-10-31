/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useState, useRef, lazy, Suspense } from "react";
import type { HydratedPost } from "@/src/lib/types";
import { AuthForm } from "./AuthForm";
import { UserHeader } from "./postCard/UserHeader";
import { MediaSection } from "./postCard/MediaSection";
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
import { useIsMe, useAuth } from "@/src/lib/hooks/useAuth";
import { useToast } from "./Toast";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { PostCardBody } from "./PostCardBody";

// Lazy load heavy components
const FullscreenViewer = lazy(() => import("./FullscreenViewer"));
const Editor = lazy(() => import("./postCard/Editor").then(mod => ({ default: mod.Editor })));

// Memoize PostCard to prevent unnecessary re-renders when parent updates
const PostCardComponent = ({ post: initial, allowCarouselTouch, disableMediaNavigation, disableCardNavigation, index }: { post: HydratedPost; allowCarouselTouch?: boolean; disableMediaNavigation?: boolean; disableCardNavigation?: boolean; index?: number }) => {
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
  const [showWeather, setShowWeather] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const pathname = usePathname();
  const { isMe, isLoading: authLoading } = useIsMe(post.userId);
  const { me } = useAuth();
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
        followBtnRef={followBtnRef}
        followAnim={followAnim}
        setFollowAnim={setFollowAnim}
        followExpanded={followExpanded}
        setFollowExpanded={setFollowExpanded}
        followExpandTimerRef={followExpandTimerRef}
        followAnimTimerRef={followAnimTimerRef}
        followInFlightRef={followInFlightRef}
        handleDeleteActivation={handleDeleteActivation}
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
        index={index}
      />

      <PostCardBody
        post={post}
        editing={editing}
        editorAnim={editorAnim}
        showEditor={showEditor}
        editorWrapRef={editorWrapRef}
        handleTransitionEnd={handleTransitionEnd}
        editorRef={editorRef}
        handleCancel={handleCancel}
        handleSave={handleSave}
        commentsOpen={commentsOpen}
        setCommentsOpen={setCommentsOpen}
        commentsMounted={commentsMounted}
        setCommentsMounted={setCommentsMounted}
        commentsRef={commentsRef}
        count={count}
        setCount={setCount}
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
        setShowExif={setShowExif}
        showSpotify={showSpotify}
        setShowSpotify={setShowSpotify}
        showWeather={showWeather}
        setShowWeather={setShowWeather}
        showLocation={showLocation}
        setShowLocation={setShowLocation}
        spotifyLink={post.spotifyLink}
        camera={post.camera}
        lens={post.lens}
        filmType={post.filmType}
        weatherCondition={post.weatherCondition}
        weatherTemperature={post.weatherTemperature}
        weatherLocation={post.weatherLocation}
        locationLatitude={post.locationLatitude}
        locationLongitude={post.locationLongitude}
        locationAddress={post.locationAddress}
        openFullscreen={() => {
          const imageUrls = (post as any).imageUrls || ((post as any).imageUrl ? [(post as any).imageUrl] : []);
          const alts = Array.isArray(post.alt) ? post.alt : [post.alt || ''];
          const images = imageUrls.map((src: string, index: number) => ({
            src,
            alt: alts[index] || `Photo ${index + 1}`
          }));
          handleOpenFullscreen(images, currentImageIndex);
        }}
        spotifyMeta={spotifyMeta}
        fsOpen={fsOpen}
        fsImages={fsImages}
        fsCurrentIndex={fsCurrentIndex}
        handleCloseFullscreen={handleCloseFullscreen}
        handleNextImage={handleNextImage}
        handlePrevImage={handlePrevImage}
        isAuthed={!!me}
        onSignIn={() => setShowAuth(true)}
      />
    </article>
  );
}

// Memoize PostCard with shallow comparison to prevent re-renders when posts haven't changed
export const PostCard = memo(PostCardComponent);
