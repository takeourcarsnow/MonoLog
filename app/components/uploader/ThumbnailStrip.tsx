import { OptimizedImage } from "@/app/components/OptimizedImage";
import { EditorSettings } from "../imageEditor/types";

interface ThumbnailStripProps {
  dataUrls: string[];
  alt: string | string[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  setDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setOriginalDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  editorSettings: EditorSettings[];
  setEditorSettings: React.Dispatch<React.SetStateAction<EditorSettings[]>>;
}

export function ThumbnailStrip({ dataUrls, alt, index, setIndex, setDataUrls, setOriginalDataUrls, editorSettings, setEditorSettings }: ThumbnailStripProps) {
  if (dataUrls.length <= 1) return null;

  const handleDragStart = (e: React.DragEvent, draggedIndex: number) => {
    e.dataTransfer.setData('text/plain', draggedIndex.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (draggedIndex === dropIndex) return;

    // Reorder arrays
    const newDataUrls = [...dataUrls];
    const newOriginalDataUrls = [...dataUrls]; // Assuming originalDataUrls mirrors dataUrls
    const newEditorSettings = [...editorSettings];

    // Move the dragged item to the new position
    const [draggedDataUrl] = newDataUrls.splice(draggedIndex, 1);
    newDataUrls.splice(dropIndex, 0, draggedDataUrl);

    const [draggedOriginal] = newOriginalDataUrls.splice(draggedIndex, 1);
    newOriginalDataUrls.splice(dropIndex, 0, draggedOriginal);

    const [draggedSettings] = newEditorSettings.splice(draggedIndex, 1);
    newEditorSettings.splice(dropIndex, 0, draggedSettings);

    setDataUrls(newDataUrls);
    setOriginalDataUrls(newOriginalDataUrls);
    setEditorSettings(newEditorSettings);

    // Update index if necessary
    if (index === draggedIndex) {
      setIndex(dropIndex);
    } else if (index > draggedIndex && index <= dropIndex) {
      setIndex(index - 1);
    } else if (index < draggedIndex && index >= dropIndex) {
      setIndex(index + 1);
    }
  };

  return (
    <div className="thumbs" style={{ background: 'transparent' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {dataUrls.map((u, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => { setIndex(idx); }}
            aria-pressed={index === idx}
            style={{ border: index === idx ? '2px solid var(--primary)' : '1px solid var(--border)' }}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, idx)}
          >
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
