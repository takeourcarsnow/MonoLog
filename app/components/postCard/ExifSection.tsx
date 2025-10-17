import { Camera, Settings, Image, Gauge } from "lucide-react";

interface ExifSectionProps {
  showExif: boolean;
  camera?: string;
  lens?: string;
  filmType?: string;
}

export const ExifSection = ({ showExif, camera, lens, filmType }: ExifSectionProps) => {
  if (!(camera || lens || filmType)) return null;

  return (
    <div className={`exif-section ${showExif ? 'open' : ''}`}>
      <div className="exif-info" style={{ marginTop: 8, fontSize: 14, color: 'var(--text)', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '8px 12px', justifyContent: 'center', alignItems: 'center' }}>
          {(() => {
            const parts = [];
            if (camera) parts.push(<><Camera size={12} style={{ marginRight: 4 }} />{camera}</>);
            if (lens) parts.push(<><Settings size={12} style={{ marginRight: 4 }} />{lens}</>);

            // Parse film type and ISO from combined field
            if (filmType) {
              const filmParts = filmType.trim().split(' ');
              if (filmParts.length > 1) {
                const lastPart = filmParts[filmParts.length - 1];
                // Check if last part looks like ISO (number, number+F, or CT[number])
                const isoRegex = /^(\d+|CT\d+|\d+F)$/i;
                if (isoRegex.test(lastPart)) {
                  const filmTypeParsed = filmParts.slice(0, -1).join(' ');
                  const iso = lastPart;
                  if (filmTypeParsed) parts.push(<><Image size={12} style={{ marginRight: 4 }} />{filmTypeParsed}</>);
                  parts.push(<><Gauge size={12} style={{ marginRight: 4 }} />{iso}</>);
                } else {
                  parts.push(<><Image size={12} style={{ marginRight: 4 }} />{filmType}</>);
                }
              } else {
                parts.push(<><Image size={12} style={{ marginRight: 4 }} />{filmType}</>);
              }
            }

            const content = parts.map((part, index) => (
              <span key={`first-${index}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {part}
              </span>
            ));

            // Duplicate content for seamless scrolling
            const duplicated = parts.map((part, index) => (
              <span key={`second-${index}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {part}
              </span>
            ));

            return [...content, ...duplicated];
          })()}
        </div>
      </div>
    </div>
  );
};