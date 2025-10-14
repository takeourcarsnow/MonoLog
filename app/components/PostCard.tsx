/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useState, useRef, lazy, Suspense } from "react";
import type { HydratedPost } from "@/src/lib/types";
import { AuthForm } from "./AuthForm";
import { UserHeader } from "./postCard/UserHeader";
import { MediaSection } from "./postCard/MediaSection";
import { ActionsSection } from "./postCard/ActionsSection";
import { CommentsSection } from "./postCard/CommentsSection";
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
import { Camera, Settings, Image } from "lucide-react";

// Lazy load heavy components
const FullscreenViewer = lazy(() => import("./FullscreenViewer"));
const Editor = lazy(() => import("./postCard/Editor").then(mod => ({ default: mod.Editor })));

// Memoize PostCard to prevent unnecessary re-renders when parent updates
const PostCardComponent = ({ post: initial, allowCarouselTouch, disableMediaNavigation }: { post: HydratedPost; allowCarouselTouch?: boolean; disableMediaNavigation?: boolean }) => {
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
  const { fsOpen, fsSrc, fsAlt, handleOpenFullscreen, handleCloseFullscreen } = useFullscreen();
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
  <article id={`post-${post.id}`} onClick={handleCardClick} className={`card ${isMultipost ? 'multipost' : ''} ${showEditor ? 'editor-open' : ''} ${opening ? 'editor-opening' : ''}${fsOpen ? ' fs-open' : ''}`}>
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
          const success = await toggleFavoriteWithAuth();
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
              const src = imageUrls[currentImageIndex] || imageUrls[0];
              const alt = alts[currentImageIndex] || alts[0] || 'Photo';
              if (src) handleOpenFullscreen(src, alt);
            }}
          />
          <div className={`exif-section ${showExif ? "open" : ""}`}>
            <div className="exif-info" style={{ marginTop: 8, fontSize: 14, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', alignItems: 'center' }}>
              {post.camera || post.lens || post.filmType ? (
                <>
                  {post.camera && <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}><Camera size={14} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.camera}</span></div>}
                  {post.lens && <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}><Settings size={14} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.lens}</span></div>}
                  {post.filmType && <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}><Image size={14} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.filmType}</span></div>}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={14} /> No EXIF data</div>
              )}
            </div>
          </div>
          <div className={`spotify-section ${showSpotify ? "open" : ""}`}>
            {post.spotifyLink ? (
              <div className="spotify-info" style={{ marginTop: 8, fontSize: 14, color: 'var(--text)', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                <a
                  href={post.spotifyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="spotify-preview-link"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit', justifyContent: 'center' }}
                >
                  {/* show album art thumbnail when available, otherwise small Spotify icon */}
                  {spotifyMeta?.thumbnail_url ? (
                    <img
                      src={spotifyMeta.thumbnail_url}
                      alt={spotifyMeta.title ? `${spotifyMeta.title} album art` : 'Spotify album art'}
                      width={36}
                      height={36}
                      style={{ display: 'block', objectFit: 'cover', borderRadius: '50%', width: 36, height: 36, flexShrink: 0 }}
                    />
                  ) : (
                    <svg viewBox="0 0 168 168" width="18" height="18" aria-hidden style={{ display: 'block' }}>
                      <path fill="#1DB954" d="M84 0a84 84 0 1 0 0 168A84 84 0 0 0 84 0z" />
                      <path fill="#fff" d="M120.6 115.6c-1.9 2.9-5.9 3.8-8.8 1.9-21.8-14.3-49.3-17.6-81.5-9.9-3.3.8-6.5-1.3-7.4-4.6-.9-3.3 1.3-6.5 4.6-7.4 35.3-8.6 66.4-5 90.3 11.7 2.9 1.9 3.8 5.9 1.8 8.3zM126.6 92c-2.4 3.6-7.7 4.6-11.4 2.2-25.1-16.2-63.4-20.9-93.2-11.8-4 .1-7.3-2.6-7.7-6.6-.4-3.9 2.6-7.3 6.6-7.7 33.5-8.6 75.1-3.6 103.8 13.4 3.6 2.4 4.6 7.7 2.2 11.9zM129.6 68.6c-28.3-17.1-79.5-18.6-109.2-10.5-4.6 1.1-9.3-1.7-10.4-6.3-1.1-4.6 1.7-9.3 6.3-10.4 33.9-7.9 90.6-6 126 13.1 5.1 3 6.8 9.7 3.8 14.8-3 5.1-9.7 6.8-14.5 3.4z" />
                    </svg>
                  )}
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>
                    {spotifyMeta?.author_name ? `${spotifyMeta.author_name} - ` : ''}
                    {spotifyMeta?.title || 'Open on Spotify'}
                  </span>
                </a>
              </div>
            ) : null}
          </div>
          <CommentsSection
            postId={post.id}
            commentsMounted={commentsMounted}
            commentsOpen={commentsOpen}
            commentsRef={commentsRef}
            setCount={setCount}
          />
        </div>

        {/* Render editor while editing OR while it's animating out (showEditor)
            so exit animation can play before unmounting. */}
        {showEditor && (
          <div
            ref={editorWrapRef}
            className={`post-editor-wrap ${editorAnim === 'enter' ? 'enter' : editorAnim === 'exit' ? 'exit' : ''}`}
            onTransitionEnd={handleTransitionEnd}
          >
            <Suspense fallback={<div>Loading editor...</div>}>
              <Editor
                ref={editorRef}
                post={post}
                onCancel={handleCancel}
                onSave={handleSave}
              />
            </Suspense>
          </div>
        )}
        </div>
      {fsOpen && fsSrc && (
        <Suspense fallback={null}>
          <FullscreenViewer src={fsSrc} alt={fsAlt} onClose={handleCloseFullscreen} />
        </Suspense>
      )}
    </article>
  );
}

// Memoize PostCard with shallow comparison to prevent re-renders when posts haven't changed
export const PostCard = PostCardComponent;
