"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { compressImage, approxDataUrlBytes } from "@/lib/image";
import { CONFIG } from "@/lib/config";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import ImageEditor from "./ImageEditor";
export function Uploader() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [processing, setProcessing] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [canReplace, setCanReplace] = useState(false);
  const [editing, setEditing] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const can = await api.canPostToday();
      setCanReplace(!can.allowed);
    })();
  }, []);

  const toast = useToast();

  const setDrag = (on: boolean) => {
    dropRef.current?.classList.toggle("dragover", on);
  };

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.show("Please select an image file");
      return;
    }
    setProcessing(true);
    setOriginalSize(file.size);
    setCompressedSize(null);
    try {
      const url = await compressImage(file);
      const bytes = approxDataUrlBytes(url);
      setCompressedSize(bytes);
      setDataUrl(url);
      // ensure any previously-open editor is closed when a new file is chosen
      setEditing(false);
      // clear the file input so selecting the same file again will fire change
      try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
      if (!alt && caption) setAlt(caption);
    } catch (e) {
      console.error(e);
      toast.show("Failed to process image");
      setDataUrl(null);
      try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
    } finally {
      setProcessing(false);
    }
  }

  async function publish(replace: boolean) {
    if (!dataUrl) return toast.show("Please select an image");
    const maxBytes = CONFIG.imageMaxSizeMB * 1024 * 1024;
    if (compressedSize && compressedSize > maxBytes) {
      return toast.show(`Compressed image is too large (${Math.round(compressedSize/1024)} KB). Try a smaller photo or reduce quality.`);
    }
    try {
      await api.createOrReplaceToday({
        imageUrl: dataUrl,
        caption,
        alt: alt || caption || "Daily photo",
        replace,
        public: visibility === "public",
      });
      router.push("/profile");
    } catch (e: any) {
      if (e?.code === "LIMIT") {
        toast.show("You already posted today. Tap 'Replace today’s post' to replace it.");
      } else {
        toast.show(e?.message || "Failed to publish");
      }
    }
  }

  return (
    <div className="uploader view-fade">
      <div className="toolbar">
        <div>
          <strong>Post your photo for today</strong>
          <div className="dim">One photo per day</div>
        </div>
      </div>

      <div
        className="drop"
        ref={dropRef}
        tabIndex={0}
        role="button"
        aria-label="Drop an image or click to select"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
        onDrop={async (e) => {
          e.preventDefault(); setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) await handleFile(file);
        }}
      >
        <div className="drop-inner">
          <div className="drop-icon" aria-hidden>
            +
          </div>
          <div className="drop-text">Drop image here or click to select</div>
          <div className="dim" style={{ marginTop: 6 }}>
            JPEG/PNG up to ~{CONFIG.imageMaxSizeMB}MB
          </div>
        </div>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={async () => {
            const file = fileInputRef.current?.files?.[0];
            if (file) await handleFile(file);
          }}
        />
      </div>

      <div className={`preview ${dataUrl ? "" : "hidden"}`}>
        <div className="preview-inner" style={{ position: 'relative' }}>
          {editing && dataUrl ? (
            <div style={{ width: '100%' }}>
              <ImageEditor
                initialDataUrl={dataUrl}
                onCancel={() => setEditing(false)}
                onApply={async (newUrl) => {
                  setEditing(false);
                  // run through the same compression pipeline to ensure final image obeys limits
                  setProcessing(true);
                  try {
                    const compressed = await compressImage(newUrl as any);
                    setDataUrl(compressed);
                    setCompressedSize(approxDataUrlBytes(compressed));
                    // approximate original size from dataurl length
                    setOriginalSize(approxDataUrlBytes(newUrl));
                  } catch (e) {
                    console.error(e);
                    // fallback to the edited url directly
                    setDataUrl(newUrl);
                    setCompressedSize(approxDataUrlBytes(newUrl));
                  } finally {
                    setProcessing(false);
                  }
                }}
              />
            </div>
          ) : (
            <>
              <img alt={alt || 'Preview'} src={dataUrl || ""} />
              {dataUrl ? (
                <button
                  className="btn"
                  style={{ position: 'absolute', right: 8, bottom: 8 }}
                  onClick={() => setEditing(true)}
                >
                  Edit photo
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        {originalSize ? <div className="dim">Original: {Math.round(originalSize/1024)} KB</div> : null}
        {compressedSize ? <div className="dim">Compressed: {Math.round(compressedSize/1024)} KB</div> : null}
        {compressedSize && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024 ? (
          <div className="warn">Compressed image exceeds the maximum of {CONFIG.imageMaxSizeMB} MB. Please resize or choose a smaller file.</div>
        ) : null}
      </div>

      <input
        className="input"
        type="text"
        placeholder="Alt text (describe your photo for accessibility)"
        value={alt}
        onChange={e => setAlt(e.target.value)}
      />
      <input
        className="input"
        type="text"
        placeholder="Caption (optional)"
        value={caption}
        onChange={e => setCaption(e.target.value)}
      />
      <div className="form-row">
        <label className="vis-label">
          <span className="dim">Visibility</span>
          <div role="radiogroup" aria-label="Post visibility" style={{ display: 'inline-flex', gap: 8 }}>
            <button
              type="button"
              className={`btn ${visibility === 'public' ? 'active' : ''}`}
              aria-pressed={visibility === 'public'}
              onClick={() => setVisibility('public')}
            >
              Public
            </button>
            <button
              type="button"
              className={`btn ${visibility === 'private' ? 'active' : ''}`}
              aria-pressed={visibility === 'private'}
              onClick={() => setVisibility('private')}
            >
              Private
            </button>
          </div>
        </label>

        <div className="btn-group">
          <button className="btn primary" onClick={() => publish(false)} disabled={processing || (compressedSize !== null && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024)}>
            {processing ? "Processing…" : canReplace ? "Publish (new day)" : "Publish"}
          </button>
          <button
            className={`btn ghost replace ${canReplace ? "" : "hidden"}`}
            onClick={() => publish(true)}
            disabled={processing}
          >
            Replace
          </button>
        </div>
      </div>

      <div aria-live="polite" className="sr-only status">
        {/* screen-reader updates for processing/errors */}
      </div>
    </div>
  );
}