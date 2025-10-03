import { memo } from "react";
import { Comments } from "../Comments";

interface CommentsSectionProps {
  postId: string;
  commentsMounted: boolean;
  commentsOpen: boolean;
  commentsRef: React.RefObject<HTMLDivElement>;
  setCount: (value: number) => void;
}

export const CommentsSection = memo(function CommentsSection({
  postId,
  commentsMounted,
  commentsOpen,
  commentsRef,
  setCount,
}: CommentsSectionProps) {
  return (
    <>
      {commentsMounted && (
        <div className={`comments ${commentsOpen ? "open" : ""}`} id={`comments-${postId}`} ref={commentsRef}>
          <div>
            <Comments postId={postId} onCountChange={setCount} />
          </div>
        </div>
      )}
    </>
  );
});