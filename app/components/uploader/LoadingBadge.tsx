import LogoLoader from "./LogoLoader";

interface LoadingBadgeProps {
  processing: boolean;
  publishing?: boolean;
  previewLoaded: boolean;
}

export function LoadingBadge({ processing, publishing = false, previewLoaded }: LoadingBadgeProps) {
  if (!processing || publishing) return null;

  // Use the 'first' variant for the main processing overlay so the primary
  // (first) photo loader remains visually consistent across uploader views.
  return (
    <div className="drop-zone-loader" role="status" aria-live="polite">
      <LogoLoader size={86} variant="first" />
    </div>
  );
}
