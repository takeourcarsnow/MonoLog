import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { HydratedPost } from "@/src/lib/types";
import { Check, X, Camera, Settings, Image, Gauge, Eye, EyeOff } from "lucide-react";
import { Combobox } from "../Combobox";
import { CAMERA_PRESETS, LENS_PRESETS, FILM_PRESETS, ISO_PRESETS } from "@/src/lib/exifPresets";

export const Editor = forwardRef(function Editor({ post, onCancel, onSave }: {
  post: HydratedPost;
  onCancel: () => void;
  onSave: (patch: { caption: string; public: boolean; camera?: string; lens?: string; filmType?: string }) => Promise<void>;
}, ref: any) {
  const [caption, setCaption] = useState(post.caption || "");
  const [camera, setCamera] = useState(post.camera || "");
  const [lens, setLens] = useState(post.lens || "");
  const [filmType, setFilmType] = useState("");
  const [filmIso, setFilmIso] = useState("");
  const [isPublic, setIsPublic] = useState(post.public);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Split existing filmType into film name and ISO
  useEffect(() => {
    if (post.filmType) {
      const parts = post.filmType.split(' ');
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        // Check if last part is an ISO value
        if (ISO_PRESETS.includes(lastPart)) {
          setFilmType(parts.slice(0, -1).join(' '));
          setFilmIso(lastPart);
        } else {
          setFilmType(post.filmType);
        }
      } else {
        setFilmType(post.filmType);
      }
    }
  }, [post.filmType]);

  const doSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const combinedFilmType = (filmType && filmIso) ? `${filmType} ${filmIso}` : (filmType || filmIso) || undefined;
      await onSave({ caption, public: isPublic, camera, lens, filmType: combinedFilmType });
    } finally {
      setSaving(false);
    }
  }, [caption, camera, lens, filmType, filmIso, isPublic, onSave, saving]);

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
          icon={Camera}
        />
        <Combobox
          value={lens}
          onChange={setLens}
          options={LENS_PRESETS}
          placeholder="Lens"
          icon={Settings}
        />
        <Combobox
          value={filmType}
          onChange={(value) => {
            setFilmType(value);
            if (!value) setFilmIso(''); // Clear ISO when film is cleared
          }}
          options={FILM_PRESETS}
          placeholder="Film"
          icon={Image}
        />
        {filmType && (
          <Combobox
            value={filmIso}
            onChange={setFilmIso}
            options={ISO_PRESETS}
            placeholder="ISO"
            icon={Gauge}
          />
        )}
        <button
          type="button"
          className={`vis-toggle ${isPublic ? 'public' : 'private'}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsPublic(!isPublic);
          }}
          aria-label={isPublic ? "Make private" : "Make public"}
          style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
        >
          <span className="vis-icon" aria-hidden>
            {isPublic ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a20.16 20.16 0 0 1 5.06-5.94" stroke="currentColor" />
                <path d="M1 1l22 22" stroke="currentColor" />
              </svg>
            )}
          </span>
          <span>{isPublic ? 'Public' : 'Private'}</span>
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn ghost no-effects"
            onClick={() => onCancel()}
            aria-label="Cancel edits"
            style={{ padding: '10px' }}
          >
            <X size={16} />
          </button>
          <button
            type="button"
            className={`btn btn-no-bg keep-border no-effects ${saving ? 'disabled' : ''}`}
            onClick={async () => { if (!saving) await doSave(); }}
            aria-label="Save edits"
            disabled={saving}
            style={{ padding: '10px' }}
          >
            <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});
