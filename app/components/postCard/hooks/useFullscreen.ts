import { useState } from 'react';

export const useFullscreen = () => {
  const [fsOpen, setFsOpen] = useState(false);
  const [fsSrc, setFsSrc] = useState<string | null>(null);
  const [fsAlt, setFsAlt] = useState<string>('Photo');

  const handleOpenFullscreen = (src?: string, alt?: string) => {
    if (!src) return;
    setFsSrc(src);
    setFsAlt(alt || 'Photo');
    setFsOpen(true);
  };

  const handleCloseFullscreen = () => {
    setFsOpen(false);
    setFsSrc(null);
  };

  return {
    fsOpen,
    fsSrc,
    fsAlt,
    handleOpenFullscreen,
    handleCloseFullscreen
  };
};