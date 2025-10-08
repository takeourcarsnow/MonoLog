import LogoLoader from "./LogoLoader";

interface LoadingBadgeProps {
  processing: boolean;
  previewLoaded: boolean;
}

export function LoadingBadge({ processing, previewLoaded }: LoadingBadgeProps) {
  if (!processing) return null;

  // When actively processing (replace/confirm edit), show the full overlay
  // identical to the dropzone loader so the visuals are consistent.
  return (
    <div className="drop-zone-loader" role="status" aria-live="polite">
      <LogoLoader size={86} />
    </div>
  );
}
