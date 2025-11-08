import { Suspense, lazy } from "react";
import type { HydratedPost } from "@/lib/types";
import { CaptionDisplay } from "./postCard/CaptionDisplay";
import { ActionsSection } from "./postCard/ActionsSection";
import { CommentsSection } from "./postCard/CommentsSection";
import { SpotifySection } from "./postCard/SpotifySection";
import { ExifSection } from "./postCard/ExifSection";
import { LocationSection } from "./postCard/LocationSection";
import { EditorWrap } from "./postCard/EditorWrap";
import { usePostContext } from "./postCard/PostContext";

// Lazy load heavy components
const FullscreenViewer = lazy(() => import("@/app/components/media/FullscreenViewer"));

interface PostCardBodyProps {
  editing: boolean;
  editorAnim: 'enter' | 'exit' | null;
  showEditor: boolean;
  editorWrapRef: React.RefObject<HTMLDivElement | null>;
  handleTransitionEnd: (e: React.TransitionEvent) => void;
  editorRef: React.RefObject<any>;
  handleCancel: () => void;
  handleSave: (patch: any) => Promise<void>;
  commentsOpen: boolean;
  setCommentsOpen: (value: boolean) => void;
  commentsMounted: boolean;
  setCommentsMounted: (value: boolean) => void;
  commentsRef: React.RefObject<HTMLDivElement | null>;
  count: number;
  setCount: (count: number) => void;
  isFavorite: boolean;
  setIsFavorite: (favorite: boolean) => void;
  toggleFavoriteWithAuth: () => Promise<boolean>;
  showAuth: boolean;
  setShowAuth: (show: boolean) => void;
  sharePost: () => Promise<boolean>;
  api: any;
  toast: any;
  showFavoriteFeedback: (action: 'adding' | 'removing') => void;
  activeSection: 'exif' | 'spotify' | 'weather' | 'location' | null;
  setActiveSection: (section: 'exif' | 'spotify' | 'weather' | 'location' | null) => void;
  openFullscreen: () => void;
  spotifyMeta: any;
  fsOpen: boolean;
  fsImages: any[];
  fsCurrentIndex: number;
  handleCloseFullscreen: () => void;
  handleNextImage: () => void;
  handlePrevImage: () => void;
  isAuthed?: boolean;
  onSignIn?: () => void;
}

export function PostCardBody({
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
  activeSection,
  setActiveSection,
  openFullscreen,
  spotifyMeta,
  fsOpen,
  fsImages,
  fsCurrentIndex,
  handleCloseFullscreen,
  handleNextImage,
  handlePrevImage,
  isAuthed,
  onSignIn,
}: PostCardBodyProps) {
  const { post } = usePostContext();
  const showExif = activeSection === 'exif';
  const showSpotify = activeSection === 'spotify';
  const showWeather = activeSection === 'weather';
  const showLocation = activeSection === 'location';

  return (
    <div className="card-body">
      {/* Caption/actions are always rendered but visually hidden when editor is entering.
          This allows the caption/actions to fade/collapse smoothly while the editor
          expands, avoiding a sudden jump on open. */}
      <div className="caption-wrap" aria-hidden={editorAnim === 'enter'}>
        <CaptionDisplay caption={post.caption} isAuthed={isAuthed} onSignIn={onSignIn} />
        <ActionsSection
          postId={post.id}
          count={count}
          commentsOpen={commentsOpen}
          setCommentsOpen={(value: boolean) => {
            setCommentsOpen(value);
            if (value) setActiveSection(null); // Close active section when opening comments
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
            setActiveSection(value ? 'exif' : null);
          }}
          showSpotify={showSpotify}
          setShowSpotify={(value: boolean) => {
            setActiveSection(value ? 'spotify' : null);
          }}
          showWeather={showWeather}
          setShowWeather={(value: boolean) => {
            setActiveSection(value ? 'weather' : null);
          }}
          showLocation={showLocation}
          setShowLocation={(value: boolean) => {
            setActiveSection(value ? 'location' : null);
          }}
          openFullscreen={openFullscreen}
        />

        <SpotifySection
          showSpotify={showSpotify}
          spotifyMeta={spotifyMeta}
        />
        <ExifSection
          showExif={showExif}
        />
        {/* Weather and Location are shown in the header (UserHeader);
            keep action buttons but do not render the expanded sections here. */}
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