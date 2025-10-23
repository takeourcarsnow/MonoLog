import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { HydratedPost } from "@/src/lib/types";
import { Check, X, Camera, Settings, Image, Gauge, Eye, EyeOff, Monitor, Film } from "lucide-react";
import { Combobox } from "../Combobox";
import { CAMERA_PRESETS, CAMERA_DIGITAL_PRESETS, CAMERA_FILM_PRESETS, LENS_PRESETS, FILM_PRESETS, ISO_PRESETS } from "@/src/lib/exifPresets";

export const Editor = forwardRef(function Editor({ post, onCancel, onSave }: {
  post: HydratedPost;
  onCancel: () => void;
  onSave: (patch: { caption: string; public: boolean; camera?: string; lens?: string; filmType?: string; spotifyLink?: string }) => Promise<void>;
}, ref: any) {
  const [caption, setCaption] = useState(post.caption || "");
  const [camera, setCamera] = useState(post.camera || "");
  const [lens, setLens] = useState(post.lens || "");
  const [filmType, setFilmType] = useState("");
  const [filmIso, setFilmIso] = useState("");
  const [isPublic, setIsPublic] = useState(post.public);
  const [spotifyLink, setSpotifyLink] = useState(post.spotifyLink || "");
  const [saving, setSaving] = useState(false);
  const [activeExifField, setActiveExifField] = useState<string | null>(null);
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
      // If both filmType and filmIso are empty, send an empty string so the
      // server will update/clear the DB value. Previously we sent `undefined`
      // which meant "do not change" and prevented clearing.
  const combinedFilmType = (filmType && filmIso) ? `${filmType} ${filmIso}` : (filmType || filmIso) || '';
  const patch = { caption, public: isPublic, camera, lens, filmType: combinedFilmType, spotifyLink };
  await onSave(patch);
    } finally {
      setSaving(false);
    }
  }, [caption, camera, lens, filmType, filmIso, isPublic, spotifyLink, onSave, saving]);

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

  // Close active EXIF field when clicking outside the editor
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (!el.contains(target)) {
        // clicking outside editor -> clear active field
        setActiveExifField(null);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  return (
    <div ref={editorRef} className="post-editor" tabIndex={-1}>
      <textarea
        className="edit-caption input"
        placeholder="Tell your story (if you feel like it)"
        value={caption}
        onChange={e => setCaption(e.target.value)}
        autoFocus
        rows={3}
        style={{ resize: 'vertical', minHeight: '60px' }}
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            await doSave();
          }
        }}
      />
      <input
        type="url"
        className="edit-spotify input"
        placeholder="Spotify link (optional)"
        value={spotifyLink}
        onChange={e => setSpotifyLink(e.target.value)}
        style={{ marginTop: 8 }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {activeExifField === null ? (
          // Show all fields when none is active
          <>
            <CameraScopeSelector
              camera={camera}
              setCamera={setCamera}
              onFocus={() => setActiveExifField('camera')}
              onBlur={() => setActiveExifField(null)}
            />
            <Combobox
              value={lens}
              onChange={setLens}
              options={LENS_PRESETS}
              placeholder="Lens"
              icon={Settings}
              onFocus={() => setActiveExifField('lens')}
              onBlur={() => setActiveExifField(null)}
            />
            {!camera || !CAMERA_DIGITAL_PRESETS.includes(camera) ? (
              <>
                <Combobox
                  value={filmType}
                  onChange={(value) => {
                    setFilmType(value);
                    if (!value) setFilmIso(''); // Clear ISO when film is cleared
                  }}
                  options={FILM_PRESETS}
                  placeholder="Film"
                  icon={Image}
                  onFocus={() => setActiveExifField('film')}
                  onBlur={() => setActiveExifField(null)}
                />
                {filmType && (
                  <Combobox
                    value={filmIso}
                    onChange={setFilmIso}
                    options={ISO_PRESETS}
                    placeholder="ISO"
                    icon={Gauge}
                    onFocus={() => setActiveExifField('iso')}
                    onBlur={() => setActiveExifField(null)}
                  />
                )}
              </>
            ) : null}
          </>
        ) : (
          // Show only the active field in full width
          <div style={{ width: '100%' }}>
            {activeExifField === 'camera' && (
              <CameraScopeSelector
                camera={camera}
                setCamera={setCamera}
                onFocus={() => setActiveExifField('camera')}
                onBlur={() => setActiveExifField(null)}
                expanded={true}
              />
            )}
            {activeExifField === 'lens' && (
              <Combobox
                value={lens}
                onChange={setLens}
                options={LENS_PRESETS}
                placeholder="Lens"
                icon={Settings}
                onFocus={() => setActiveExifField('lens')}
                onBlur={() => setActiveExifField(null)}
                expanded={true}
              />
            )}
            {activeExifField === 'film' && (!camera || !CAMERA_DIGITAL_PRESETS.includes(camera)) && (
              <Combobox
                value={filmType}
                onChange={(value) => {
                  setFilmType(value);
                  if (!value) setFilmIso(''); // Clear ISO when film is cleared
                }}
                options={FILM_PRESETS}
                placeholder="Film"
                icon={Image}
                onFocus={() => setActiveExifField('film')}
                onBlur={() => setActiveExifField(null)}
                expanded={true}
              />
            )}
            {activeExifField === 'iso' && filmType && (!camera || !CAMERA_DIGITAL_PRESETS.includes(camera)) && (
              <Combobox
                value={filmIso}
                onChange={setFilmIso}
                options={ISO_PRESETS}
                placeholder="ISO"
                icon={Gauge}
                onFocus={() => setActiveExifField('iso')}
                onBlur={() => setActiveExifField(null)}
                expanded={true}
              />
            )}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10 }}>
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

function CameraScopeSelector({ camera, setCamera, onFocus, onBlur, expanded }: { camera: string; setCamera: (c: string) => void; onFocus?: () => void; onBlur?: () => void; expanded?: boolean }) {
  const [scope, setScope] = useState<'all' | 'digital' | 'film'>('all');
  const getOptions = () => {
    if (scope === 'digital') return CAMERA_DIGITAL_PRESETS;
    if (scope === 'film') return CAMERA_FILM_PRESETS;
    return CAMERA_PRESETS;
  };

  const header = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      <button type="button" className={`btn mini ${scope === 'all' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setScope('all'); }} aria-pressed={scope === 'all'} title="All cameras">
        <Camera size={14} />
      </button>
      <button type="button" className={`btn mini ${scope === 'digital' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setScope('digital'); }} aria-pressed={scope === 'digital'} title="Digital cameras">
        <Monitor size={14} />
      </button>
      <button type="button" className={`btn mini ${scope === 'film' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setScope('film'); }} aria-pressed={scope === 'film'} title="Film cameras">
        <Film size={14} />
      </button>
    </div>
  );

  return (
    <Combobox
      value={camera}
      onChange={setCamera}
      options={getOptions()}
      placeholder="Camera"
      icon={Camera}
      header={header}
      onFocus={onFocus}
      onBlur={onBlur}
      expanded={expanded}
    />
  );
}
