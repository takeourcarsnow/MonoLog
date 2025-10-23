import { Suspense, lazy } from "react";
import type { HydratedPost } from "@/src/lib/types";
import { CaptionDisplay } from "./postCard/CaptionDisplay";
import { ActionsSection } from "./postCard/ActionsSection";
import { CommentsSection } from "./postCard/CommentsSection";
import { SpotifySection } from "./postCard/SpotifySection";
import { ExifSection } from "./postCard/ExifSection";
import { EditorWrap } from "./postCard/EditorWrap";

// Lazy load heavy components
const FullscreenViewer = lazy(() => import("./FullscreenViewer"));

interface PostCardBodyProps {
  post: HydratedPost;
  editing: boolean;
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
}

export function PostCardBody({
  post,
  editing,
  editorAnim,
  showEditor,
  editorWrapRef,
  handleTransitionEnd,
  editorRef,
  handleCancel,
  handleSave,
  commentsOpen,
  setCommentsOpen,
  commentsMounted,
  setCommentsMounted,
  commentsRef,
  count,
  setCount,
  isFavorite,
  setIsFavorite,
  toggleFavoriteWithAuth,
  showAuth,
  setShowAuth,
  sharePost,
  api,
  toast,
  showFavoriteFeedback,
  showExif,
  setShowExif,
  showSpotify,
  setShowSpotify,
  spotifyLink,
  camera,
  lens,
  filmType,
  openFullscreen,
  spotifyMeta,
  fsOpen,
  fsImages,
  fsCurrentIndex,
  handleCloseFullscreen,
  handleNextImage,
  handlePrevImage,
}: PostCardBodyProps) {
  return (
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
          toggleFavoriteWithAuth={toggleFavoriteWithAuth}
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
          spotifyLink={spotifyLink}
          camera={camera}
          lens={lens}
          filmType={filmType}
          openFullscreen={openFullscreen}
        />

        <SpotifySection
          showSpotify={showSpotify}
          spotifyLink={spotifyLink}
          spotifyMeta={spotifyMeta}
        />
        <ExifSection
          showExif={showExif}
          camera={camera}
          lens={lens}
          filmType={filmType}
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
    </div>
  );
}