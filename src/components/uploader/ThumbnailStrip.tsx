interface ThumbnailStripProps {
  dataUrls: string[];
  alt: string | string[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function ThumbnailStrip({ dataUrls, alt, index, setIndex }: ThumbnailStripProps) {
  if (dataUrls.length <= 1) return null;

  return (
    <div className="thumbs">
      {dataUrls.map((u, idx) => (
        <button key={idx} type="button" onClick={() => { setIndex(idx); }} aria-pressed={index === idx} style={{ border: index === idx ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
          <img src={u} alt={Array.isArray(alt) ? (alt[idx] || `Thumbnail ${idx+1}`) : (alt || `Thumbnail ${idx+1}`)} />
        </button>
      ))}
    </div>
  );
}