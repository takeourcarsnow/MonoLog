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
const PostCardComponent = ({ post: initial, allowCarouselTouch }: { post: HydratedPost; allowCarouselTouch?: boolean }) => {
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
    <article className={`card ${isMultipost ? 'multipost' : ''} ${showEditor ? 'editor-open' : ''} ${opening ? 'editor-opening' : ''}${fsOpen ? ' fs-open' : ''}`}>
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
        onImageIndexChange={setCurrentImageIndex}
      />

      <div className="card-body">
        {/* Caption/actions are always rendered but visually hidden when editor is entering.
            This allows the caption/actions to fade/collapse smoothly while the editor
            expands, avoiding a sudden jump on open. */}
  <div className="caption-wrap" aria-hidden={editorAnim === 'enter'}>
          {post.caption ? <div className="caption">{renderMentions(post.caption)}</div> : null}
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
        <Suspense fallback={<div>Loading...</div>}>
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
         prev.post.commentsCount === next.post.commentsCount;
});
