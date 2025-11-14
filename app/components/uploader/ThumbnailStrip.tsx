import { EditorSettings } from "../imageEditor/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ThumbnailStripProps {
  dataUrls: string[];
  alt: string | string[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  setDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setOriginalDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  editorSettings: EditorSettings[];
  setEditorSettings: React.Dispatch<React.SetStateAction<EditorSettings[]>>;
  setAlt?: React.Dispatch<React.SetStateAction<string | string[]>>;
  fullUrls?: string[];
  setFullUrls?: React.Dispatch<React.SetStateAction<string[]>>;
}

export function ThumbnailStrip({ dataUrls, alt, index, setIndex, setDataUrls, setOriginalDataUrls, editorSettings, setEditorSettings, setAlt, fullUrls, setFullUrls }: ThumbnailStripProps) {
  if (dataUrls.length === 0) return null;

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= dataUrls.length) return;

    const newDataUrls = [...dataUrls];
    const newOriginalDataUrls = [...dataUrls];
    const newEditorSettings = [...editorSettings];
    const newAlt = Array.isArray(alt) ? [...alt] : alt;
    const newFullUrls = fullUrls ? [...fullUrls] : undefined;

    // Swap the items
    [newDataUrls[fromIndex], newDataUrls[toIndex]] = [newDataUrls[toIndex], newDataUrls[fromIndex]];
    [newOriginalDataUrls[fromIndex], newOriginalDataUrls[toIndex]] = [newOriginalDataUrls[toIndex], newOriginalDataUrls[fromIndex]];
    [newEditorSettings[fromIndex], newEditorSettings[toIndex]] = [newEditorSettings[toIndex], newEditorSettings[fromIndex]];

    if (Array.isArray(newAlt)) {
      [newAlt[fromIndex], newAlt[toIndex]] = [newAlt[toIndex], newAlt[fromIndex]];
    }

    if (newFullUrls) {
      [newFullUrls[fromIndex], newFullUrls[toIndex]] = [newFullUrls[toIndex], newFullUrls[fromIndex]];
    }

    setDataUrls(newDataUrls);
    setOriginalDataUrls(newOriginalDataUrls);
    setEditorSettings(newEditorSettings);
    if (setAlt) {
      setAlt(Array.isArray(alt) ? newAlt : alt);
    }
    if (setFullUrls && newFullUrls) {
      setFullUrls(newFullUrls);
    }

    // Update index if necessary
    if (index === fromIndex) {
      setIndex(toIndex);
    } else if (index === toIndex) {
      setIndex(fromIndex);
    }
  };

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
    const newAlt = Array.isArray(alt) ? [...alt] : alt;
    const newFullUrls = fullUrls ? [...fullUrls] : undefined;

    // Move the dragged item to the new position
    const [draggedDataUrl] = newDataUrls.splice(draggedIndex, 1);
    newDataUrls.splice(dropIndex, 0, draggedDataUrl);

    const [draggedOriginal] = newOriginalDataUrls.splice(draggedIndex, 1);
    newOriginalDataUrls.splice(dropIndex, 0, draggedOriginal);

    const [draggedSettings] = newEditorSettings.splice(draggedIndex, 1);
    newEditorSettings.splice(dropIndex, 0, draggedSettings);

    let newAltArray: string | string[];
    if (Array.isArray(newAlt)) {
      const [draggedAlt] = newAlt.splice(draggedIndex, 1);
      newAlt.splice(dropIndex, 0, draggedAlt);
      newAltArray = newAlt;
    } else {
      newAltArray = newAlt; // If string, keep as is
    }

    if (newFullUrls) {
      const [draggedFull] = newFullUrls.splice(draggedIndex, 1);
      newFullUrls.splice(dropIndex, 0, draggedFull);
    }

    setDataUrls(newDataUrls);
    setOriginalDataUrls(newOriginalDataUrls);
    setEditorSettings(newEditorSettings);
    if (setAlt) {
      setAlt(Array.isArray(alt) ? newAltArray : alt);
    }
    if (setFullUrls && newFullUrls) {
      setFullUrls(newFullUrls);
    }

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {dataUrls.length > 1 && (
            <button
              type="button"
              onClick={() => moveItem(index, index - 1)}
              disabled={index === 0}
              style={{ 
                padding: '6px 12px', 
                border: '1px solid var(--border)', 
                background: 'var(--bg)', 
                cursor: index === 0 ? 'not-allowed' : 'pointer', 
                borderRadius: '4px',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: index === 0 ? 0.5 : 1,
                fontSize: '14px'
              }}
              title="Move selected photo left"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {dataUrls.map((u, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => { setIndex(idx); }}
                aria-pressed={index === idx}
                style={{ border: 'none', padding: 0, background: 'transparent' }}
                draggable={dataUrls.length > 1}
                onDragStart={dataUrls.length > 1 ? (e) => handleDragStart(e, idx) : undefined}
                onDragOver={dataUrls.length > 1 ? handleDragOver : undefined}
                onDrop={dataUrls.length > 1 ? (e) => handleDrop(e, idx) : undefined}
              >
                <div style={{ border: index === idx ? '2px solid var(--primary)' : '1px solid var(--border)', padding: index === idx ? '1px' : '2px' }}>
                  <img
                    src={u || "/logo.svg"}
                    alt={Array.isArray(alt) ? (alt[idx] || `Thumbnail ${idx+1}`) : (alt || `Thumbnail ${idx+1}`)}
                    style={{ width: 50, height: 50, objectFit: 'cover', display: 'block' }}
                  />
                </div>
              </button>
            ))}
          </div>
          
          {dataUrls.length > 1 && (
            <button
              type="button"
              onClick={() => moveItem(index, index + 1)}
              disabled={index === dataUrls.length - 1}
              style={{ 
                padding: '6px 12px', 
                border: '1px solid var(--border)', 
                background: 'var(--bg)', 
                cursor: index === dataUrls.length - 1 ? 'not-allowed' : 'pointer', 
                borderRadius: '4px',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: index === dataUrls.length - 1 ? 0.5 : 1,
                fontSize: '14px'
              }}
              title="Move selected photo right"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
