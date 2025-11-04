import { useCallback } from 'react';

interface UsePhotoMovementProps {
  dataUrls: string[];
  originalDataUrls: string[];
  editorSettings: any[];
  alt: string | string[];
  index: number;
  setDataUrls: (urls: string[]) => void;
  setOriginalDataUrls: (urls: string[]) => void;
  setEditorSettings: (settings: any[]) => void;
  setAlt: (alt: string | string[]) => void;
  setIndex: (index: number) => void;
}

export function usePhotoMovement({
  dataUrls,
  originalDataUrls,
  editorSettings,
  alt,
  index,
  setDataUrls,
  setOriginalDataUrls,
  setEditorSettings,
  setAlt,
  setIndex,
}: UsePhotoMovementProps) {
  const handleMoveLeft = useCallback(() => {
    if (index === 0) return;
    const newIndex = index - 1;
    // Swap dataUrls
    const newDataUrls = [...dataUrls];
    [newDataUrls[index], newDataUrls[newIndex]] = [newDataUrls[newIndex], newDataUrls[index]];
    setDataUrls(newDataUrls);
    // Swap originalDataUrls
    const newOriginalDataUrls = [...originalDataUrls];
    [newOriginalDataUrls[index], newOriginalDataUrls[newIndex]] = [newOriginalDataUrls[newIndex], newOriginalDataUrls[index]];
    setOriginalDataUrls(newOriginalDataUrls);
    // Swap editorSettings
    const newEditorSettings = [...editorSettings];
    [newEditorSettings[index], newEditorSettings[newIndex]] = [newEditorSettings[newIndex], newEditorSettings[index]];
    setEditorSettings(newEditorSettings);
    // Swap alt if it's an array
    if (Array.isArray(alt)) {
      const newAlt = [...alt];
      [newAlt[index], newAlt[newIndex]] = [newAlt[newIndex], newAlt[index]];
      setAlt(newAlt);
    }
    setIndex(newIndex);
  }, [dataUrls, originalDataUrls, editorSettings, alt, index, setDataUrls, setOriginalDataUrls, setEditorSettings, setAlt, setIndex]);

  const handleMoveRight = useCallback(() => {
    if (index === dataUrls.length - 1) return;
    const newIndex = index + 1;
    // Swap dataUrls
    const newDataUrls = [...dataUrls];
    [newDataUrls[index], newDataUrls[newIndex]] = [newDataUrls[newIndex], newDataUrls[index]];
    setDataUrls(newDataUrls);
    // Swap originalDataUrls
    const newOriginalDataUrls = [...originalDataUrls];
    [newOriginalDataUrls[index], newOriginalDataUrls[newIndex]] = [newOriginalDataUrls[newIndex], newOriginalDataUrls[index]];
    setOriginalDataUrls(newOriginalDataUrls);
    // Swap editorSettings
    const newEditorSettings = [...editorSettings];
    [newEditorSettings[index], newEditorSettings[newIndex]] = [newEditorSettings[newIndex], newEditorSettings[index]];
    setEditorSettings(newEditorSettings);
    // Swap alt if it's an array
    if (Array.isArray(alt)) {
      const newAlt = [...alt];
      [newAlt[index], newAlt[newIndex]] = [newAlt[newIndex], newAlt[index]];
      setAlt(newAlt);
    }
    setIndex(newIndex);
  }, [dataUrls, originalDataUrls, editorSettings, alt, index, setDataUrls, setOriginalDataUrls, setEditorSettings, setAlt, setIndex]);

  return { handleMoveLeft, handleMoveRight };
}