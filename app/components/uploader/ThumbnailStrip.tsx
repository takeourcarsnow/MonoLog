import { OptimizedImage } from "@/app/components/OptimizedImage";

interface ThumbnailStripProps {
  dataUrls: string[];
  alt: string | string[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function ThumbnailStrip({ dataUrls, alt, index, setIndex }: ThumbnailStripProps) {
  if (dataUrls.length <= 1) return null;

  return (
    <div className="thumbs" style={{ background: 'transparent' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {dataUrls.map((u, idx) => (
          <button key={idx} type="button" onClick={() => { setIndex(idx); }} aria-pressed={index === idx} style={{ border: index === idx ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
            <OptimizedImage
              src={u || "/logo.svg"}
              alt={Array.isArray(alt) ? (alt[idx] || `Thumbnail ${idx+1}`) : (alt || `Thumbnail ${idx+1}`)}
              width={50}
              height={50}
              style={{ width: 50, height: 50, objectFit: 'cover', display: 'block' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
