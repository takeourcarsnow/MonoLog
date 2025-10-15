import { useState } from 'react';

export const useFullscreen = () => {
  const [fsOpen, setFsOpen] = useState(false);
  const [fsImages, setFsImages] = useState<{src: string, alt: string}[]>([]);
  const [fsCurrentIndex, setFsCurrentIndex] = useState(0);

  const handleOpenFullscreen = (images: {src: string, alt: string}[], currentIndex: number = 0) => {
    if (!images.length) return;
    setFsImages(images);
    setFsCurrentIndex(currentIndex);
    setFsOpen(true);
  };

  const handleCloseFullscreen = () => {
    setFsOpen(false);
    setFsImages([]);
    setFsCurrentIndex(0);
  };

  const handleNextImage = () => {
    if (fsImages.length > 1) {
      setFsCurrentIndex((prev) => (prev + 1) % fsImages.length);
    }
  };

  const handlePrevImage = () => {
    if (fsImages.length > 1) {
      setFsCurrentIndex((prev) => (prev - 1 + fsImages.length) % fsImages.length);
    }
  };

  return {
    fsOpen,
    fsImages,
    fsCurrentIndex,
    handleOpenFullscreen,
    handleCloseFullscreen,
    handleNextImage,
    handlePrevImage
  };
};