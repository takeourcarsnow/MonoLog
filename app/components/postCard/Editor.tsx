import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { HydratedPost } from "@/src/lib/types";
import { Check, X } from "lucide-react";
import { Combobox } from "../Combobox";
import { CAMERA_PRESETS, LENS_PRESETS, FILM_TYPE_PRESETS } from "@/src/lib/exifPresets";

export const Editor = forwardRef(function Editor({ post, onCancel, onSave }: {
  post: HydratedPost;
  onCancel: () => void;
  onSave: (patch: { caption: string; public: boolean; camera?: string; lens?: string; filmType?: string }) => Promise<void>;
}, ref: any) {
  const [caption, setCaption] = useState(post.caption || "");
  const [visibility, setVisibility] = useState(post.public ? "public" : "private");
  const [camera, setCamera] = useState(post.camera || "");
  const [lens, setLens] = useState(post.lens || "");
  const [filmType, setFilmType] = useState(post.filmType || "");
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const doSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ caption, public: visibility === 'public', camera, lens, filmType });
    } finally {
      setSaving(false);
    }
  }, [caption, visibility, camera, lens, filmType, onSave, saving]);

  useImperativeHandle(ref, () => ({
    save: doSave,
    cancel: () => onCancel(),
  }), [doSave, onCancel]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    el.addEventListener('keydown', onKey);
    return () => { el.removeEventListener('keydown', onKey); };
  }, [onCancel]);

  return (
    <div ref={editorRef} className="post-editor" tabIndex={-1}>
      <input
        className="edit-caption input"
        type="text"
        placeholder="Tell your story (if you feel like it)"
        aria-label="Edit caption"
        value={caption}
        onChange={e => setCaption(e.target.value)}
        autoFocus
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            await doSave();
          }
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Combobox
          value={camera}
          onChange={setCamera}
          options={CAMERA_PRESETS}
          placeholder="Camera"
        />
        <Combobox
          value={lens}
          onChange={setLens}
          options={LENS_PRESETS}
          placeholder="Lens"
        />
        <Combobox
          value={filmType}
          onChange={setFilmType}
          options={FILM_TYPE_PRESETS}
          placeholder="Film type"
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <div>
          <button
            type="button"
            role="switch"
            aria-checked={visibility === 'private'}
            aria-label={visibility === 'private' ? 'Make post public' : 'Make post private'}
            className={`vis-toggle btn ${visibility === 'private' ? 'private' : 'public'}`}
            onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
          >
            <span className="vis-icon" aria-hidden>
              <svg className="eye-open" viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" />
              </svg>
              <svg className="eye-closed" viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a20.16 20.16 0 0 1 5.06-5.94" stroke="currentColor" />
                <path d="M1 1l22 22" stroke="currentColor" />
              </svg>
            </span>
            <span style={{ marginLeft: 8 }}>{visibility === 'private' ? 'Private' : 'Public'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn icon-reveal ${saving ? 'disabled' : ''}`}
            onClick={async () => { if (!saving) await doSave(); }}
            aria-label="Save edits"
            disabled={saving}
          >
            <span className="icon" aria-hidden="true"><Check size={16} /></span>
            <span className="reveal label">{saving ? 'Saving…' : 'Save'}</span>
          </button>
          <button
            type="button"
            className="btn ghost icon-reveal"
            onClick={() => onCancel()}
            aria-label="Cancel edits"
          >
            <span className="icon" aria-hidden="true"><X size={16} /></span>
            <span className="reveal label">Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
});
