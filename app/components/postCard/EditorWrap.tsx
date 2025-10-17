import { lazy, Suspense, RefObject } from "react";
import type { HydratedPost } from "@/src/lib/types";

const Editor = lazy(() => import("./Editor").then(mod => ({ default: mod.Editor })));

interface EditorWrapProps {
  showEditor: boolean;
  editorAnim: string | null;
  editorWrapRef: RefObject<HTMLDivElement>;
  handleTransitionEnd: (e: React.TransitionEvent) => void;
  editorRef: RefObject<any>;
  post: HydratedPost;
  handleCancel: () => void;
  handleSave: (patch: { caption: string; public: boolean; camera?: string; lens?: string; filmType?: string }) => Promise<void>;
}

export const EditorWrap = ({
  showEditor,
  editorAnim,
  editorWrapRef,
  handleTransitionEnd,
  editorRef,
  post,
  handleCancel,
  handleSave
}: EditorWrapProps) => {
  if (!showEditor) return null;

  return (
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
  );
};