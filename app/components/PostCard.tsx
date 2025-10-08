/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useState, useRef, useEffect, lazy, Suspense } from "react";
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
import { useIsMe } from "@/src/lib/hooks/useAuth";
import { useToast } from "./Toast";
import { usePathname } from "next/navigation";
import { api } from "@/src/lib/api";
import { renderMentions } from "@/src/lib/mentions";

// Lazy load heavy components
const FullscreenViewer = lazy(() => import("./FullscreenViewer"));
const Editor = lazy(() => import("./postCard/Editor").then(mod => ({ default: mod.Editor })));

// Memoize PostCard to prevent unnecessary re-renders when parent updates
const PostCardComponent = ({ post: initial, allowCarouselTouch, disableMediaNavigation }: { post: HydratedPost; allowCarouselTouch?: boolean; disableMediaNavigation?: boolean }) => {
  const { post, setPost } = usePostState(initial);
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

  const [showAuth, setShowAuth] = useState(false);
  const pathname = usePathname();
  const { isMe, isLoading: authLoading } = useIsMe(post.userId);
  const followBtnRef = useRef<HTMLButtonElement | null>(null);
  const toast = useToast();
  const [fsOpen, setFsOpen] = useState(false);
  const [fsSrc, setFsSrc] = useState<string | null>(null);
  const [fsAlt, setFsAlt] = useState<string>('Photo');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [spotifyMeta, setSpotifyMeta] = useState<{ title?: string; author_name?: string; thumbnail_url?: string } | null>(null);

  const handleOpenFullscreen = (src?: string, alt?: string) => {
    if (!src) return;
    setFsSrc(src);
    setFsAlt(alt || 'Photo');
    setFsOpen(true);
  };
  const handleCloseFullscreen = () => { setFsOpen(false); setFsSrc(null); };

  // Keep the editor mounted briefly when closing so we can animate the exit.
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editorAnim, setEditorAnim] = useState<'enter' | 'exit' | null>(null);
  const [opening, setOpening] = useState<boolean>(false);
  const editorWrapRef = useRef<HTMLDivElement | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const lastOpenAtRef = useRef<number | null>(null);
  const pendingCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // fetch Spotify oEmbed metadata for nice display & embed
    let mounted = true;
    async function fetchOEmbed() {
      try {
        if (!post.spotifyLink) return;
        const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(post.spotifyLink)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('oembed failed');
        const json = await res.json();
  // we use title/author and thumbnail (album art) for display; ignore html/embed
  if (mounted) setSpotifyMeta({ title: json.title, author_name: json.author_name, thumbnail_url: (json as any).thumbnail_url } as any);
      } catch (e) {
        // ignore failures - we'll fall back to a simple link
      }
    }
    fetchOEmbed();
    return () => { mounted = false; };
  }, [post.spotifyLink]);

  useEffect(() => {
    // Use RAF to coordinate DOM reads/writes so the wrapper mounts collapsed
    // and then we expand it to the measured height. For exit we set the
    // starting height and then collapse to 0 to animate out smoothly.
    let rafId: number | undefined;
    function runExit() {
      const el = editorWrapRef.current;
      if (el) {
        el.style.maxHeight = `${el.scrollHeight}px`;
        rafId = requestAnimationFrame(() => {
          setEditorAnim('exit');
          if (el) el.style.maxHeight = '0px';
          if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
          exitTimerRef.current = window.setTimeout(() => {
            if (editorWrapRef.current) editorWrapRef.current.style.maxHeight = '';
            setShowEditor(false);
            setEditorAnim(null);
            exitTimerRef.current = null;
          }, 360);
        }) as unknown as number;
      } else {
        setEditorAnim('exit');
        if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = window.setTimeout(() => { setShowEditor(false); setEditorAnim(null); exitTimerRef.current = null; }, 360);
      }
      setOpening(false);
    }

  // debug logging removed per user request

  if (editing && !showEditor) {
      setShowEditor(true);
      setOpening(true);
      lastOpenAtRef.current = Date.now();
      rafId = requestAnimationFrame(() => {
        const el = editorWrapRef.current;
        if (el) {
          // Ensure we start from 0 so the transition to the measured height animates
          el.style.maxHeight = '0px';
          // Force layout then set to scrollHeight
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          el.offsetHeight;
          el.style.maxHeight = `${el.scrollHeight}px`;
        }
        setEditorAnim('enter');
      }) as unknown as number;
    } else if (!editing && showEditor) {
      const now = Date.now();
      const last = lastOpenAtRef.current || 0;
      const sinceOpen = now - last;
      const MIN_OPEN_MS = 300;
      if (sinceOpen < MIN_OPEN_MS) {
        // Schedule the real exit after remaining time
        // avoid accidental immediate closes (debounce short flaps).
        if (pendingCloseTimerRef.current) window.clearTimeout(pendingCloseTimerRef.current);
        pendingCloseTimerRef.current = window.setTimeout(() => {
          pendingCloseTimerRef.current = null;
          runExit();
        }, MIN_OPEN_MS - sinceOpen);
      } else {
        runExit();
      }
    }
    return () => {
      if (typeof rafId !== 'undefined') cancelAnimationFrame(rafId as unknown as number);
      if (pendingCloseTimerRef.current) { window.clearTimeout(pendingCloseTimerRef.current); pendingCloseTimerRef.current = null; }
      if (exitTimerRef.current) { window.clearTimeout(exitTimerRef.current); exitTimerRef.current = null; }
    };
  }, [editing, showEditor]);

  return (
    <article id={`post-${post.id}`} className={`card ${isMultipost ? 'multipost' : ''} ${showEditor ? 'editor-open' : ''} ${opening ? 'editor-opening' : ''}${fsOpen ? ' fs-open' : ''}`}>
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
          {post.caption ? <div className="caption">{renderMentions(post.caption)}</div> : null}
          {post.spotifyLink ? (
            <div className="spotify-link" style={{ marginTop: 8 }}>
              <a
                href={post.spotifyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="spotify-preview-link"
                style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}
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
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{spotifyMeta?.title ? spotifyMeta.title : 'Open on Spotify'}</span>
                {spotifyMeta?.author_name ? <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>{spotifyMeta.author_name}</span> : null}
              </a>
            </div>
          ) : null}
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
            api={api}
            toast={toast}
            showFavoriteFeedback={showFavoriteFeedback}
            openFullscreen={() => {
              const imageUrls = (post as any).imageUrls || ((post as any).imageUrl ? [(post as any).imageUrl] : []);
              const alts = Array.isArray(post.alt) ? post.alt : [post.alt || ''];
              const src = imageUrls[currentImageIndex] || imageUrls[0];
              const alt = alts[currentImageIndex] || alts[0] || 'Photo';
              if (src) handleOpenFullscreen(src, alt);
            }}
          />
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
            onTransitionEnd={(e) => {
              // Only act when the max-height or opacity transition finishes on the wrapper
              if (editorAnim === 'exit' && (e.propertyName === 'max-height' || e.propertyName === 'opacity')) {
                // finished closing -> unmount
                if (editorWrapRef.current) editorWrapRef.current.style.maxHeight = '';
                setShowEditor(false);
                setEditorAnim(null);
                if (exitTimerRef.current) { window.clearTimeout(exitTimerRef.current); exitTimerRef.current = null; }
              }
              if (editorAnim === 'enter' && (e.propertyName === 'max-height' || e.propertyName === 'opacity')) {
                // finished opening -> clear any inline maxHeight so layout can be natural
                if (editorWrapRef.current) editorWrapRef.current.style.maxHeight = '';
                setEditorAnim(null);
              }
            }}
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
export const PostCard = memo(PostCardComponent, (prev, next) => {
  // Only re-render if post ID or allowCarouselTouch changes
  return prev.post.id === next.post.id && 
         prev.allowCarouselTouch === next.allowCarouselTouch &&
         prev.post.caption === next.post.caption &&
         prev.post.public === next.post.public &&
         prev.post.commentsCount === next.post.commentsCount &&
         (prev.post as any).spotifyLink === (next.post as any).spotifyLink;
});
