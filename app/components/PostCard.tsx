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
import { Camera, Settings, Image, Gauge } from "lucide-react";

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

          <div className={`spotify-section ${showSpotify ? 'open' : ''}`}>
            {post.spotifyLink ? (
              <div className="spotify-info" style={{ marginTop: 8, fontSize: 14, color: 'var(--text)', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                <div className="spotify-preview-content" style={{ position: 'relative', minHeight: 24 }}>
                  <a
                    href={post.spotifyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`spotify-preview-link ${spotifyMeta ? 'visible' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit', justifyContent: 'center' }}
                    aria-hidden={!spotifyMeta}
                  >
                    {spotifyMeta?.thumbnail_url ? (
                      <img
                        src={spotifyMeta.thumbnail_url}
                        alt={spotifyMeta.title ? `${spotifyMeta.title} album art` : 'Spotify album art'}
                        width={36}
                        height={36}
                        style={{ display: 'block', objectFit: 'cover', borderRadius: '50%', width: 36, height: 36, flexShrink: 0 }}
                      />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ display: 'block' }}>
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.42-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.5-1.14 11.28-.86 15.72 1.621.479.3.599 1.02.3 1.5-.3.48-.84.599-1.32.3z" /></svg>
                    )}
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{spotifyMeta?.author_name ? `${spotifyMeta.author_name} - ` : ''}{spotifyMeta?.title || 'Open on Spotify'}</span>
                  </a>

                  <div className={`spotify-loading ${spotifyMeta ? '' : 'visible'}`} aria-hidden={!!spotifyMeta} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ display: 'block' }}>
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.42-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.5-1.14 11.28-.86 15.72 1.621.479.3.599 1.02.3 1.5-.3.48-.84.599-1.32.3z" /></svg>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>Loading Spotify info...</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className={`exif-section ${showExif ? 'open' : ''}`}>
            {(post.camera || post.lens || post.filmType) ? (
              <div className="exif-info" style={{ marginTop: 8, fontSize: 14, color: 'var(--text)', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '8px 12px', justifyContent: 'center', alignItems: 'center' }}>
                  {(() => {
                    const parts = [];
                    if (post.camera) parts.push(<><Camera size={12} style={{ marginRight: 4 }} />{post.camera}</>);
                    if (post.lens) parts.push(<><Settings size={12} style={{ marginRight: 4 }} />{post.lens}</>);
                    
                    // Parse film type and ISO from combined field
                    if (post.filmType) {
                      const filmParts = post.filmType.trim().split(' ');
                      if (filmParts.length > 1) {
                        const lastPart = filmParts[filmParts.length - 1];
                        // Check if last part looks like ISO (number, number+F, or CT[number])
                        const isoRegex = /^(\d+|CT\d+|\d+F)$/i;
                        if (isoRegex.test(lastPart)) {
                          const filmType = filmParts.slice(0, -1).join(' ');
                          const iso = lastPart;
                          if (filmType) parts.push(<><Image size={12} style={{ marginRight: 4 }} />{filmType}</>);
                          parts.push(<><Gauge size={12} style={{ marginRight: 4 }} />{iso}</>);
                        } else {
                          parts.push(<><Image size={12} style={{ marginRight: 4 }} />{post.filmType}</>);
                        }
                      } else {
                        parts.push(<><Image size={12} style={{ marginRight: 4 }} />{post.filmType}</>);
                      }
                    }
                    
                    const content = parts.map((part, index) => (
                      <span key={`first-${index}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {part}
                      </span>
                    ));
                    
                    // Duplicate content for seamless scrolling
                    const duplicated = parts.map((part, index) => (
                      <span key={`second-${index}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {part}
                      </span>
                    ));
                    
                    return [...content, ...duplicated];
                  })()}
                </div>
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
          <FullscreenViewer src={fsSrc!} alt={fsAlt!} onClose={handleCloseFullscreen} />
        </Suspense>
      )}
    </article>
  );
}

// Memoize PostCard with shallow comparison to prevent re-renders when posts haven't changed
export const PostCard = memo(PostCardComponent);
