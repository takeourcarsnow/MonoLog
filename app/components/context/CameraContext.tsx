"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CameraContextType {
  isCameraOpen: boolean;
  setIsCameraOpen: (open: boolean) => void;
  captureCallback: ((blob: Blob) => void) | null;
  setCaptureCallback: (callback: ((blob: Blob) => void) | null) => void;
}

interface CameraContextExtra {
  // Optional initial data url when the global camera should show an
  // imported image for editing instead of opening the live stream.
  initialDataUrl: string | null;
  setInitialDataUrl: (s: string | null) => void;
  // Editing flow helpers
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  editCallback: ((blob: Blob) => void) | null;
  setEditCallback: (cb: ((blob: Blob) => void) | null) => void;
}

type FullCameraContext = CameraContextType & CameraContextExtra;

const CameraContext = createContext<FullCameraContext | undefined>(undefined);

export function CameraProvider({ children }: { children: ReactNode }) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [captureCallback, setCaptureCallback] = useState<((blob: Blob) => void) | null>(null);
  const [initialDataUrl, setInitialDataUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editCallback, setEditCallback] = useState<((blob: Blob) => void) | null>(null);

  // Side-effect: toggle a root-level class when camera is open so global
  // styles (including server-rendered header) can be hidden/adjusted while
  // the camera UI is active. This avoids needing to move the Header inside
  // the CameraProvider and keeps server-rendered markup intact.
  React.useEffect(() => {
    try {
      const root = document.documentElement;
      if (isCameraOpen) {
        root.classList.add('camera-open');
      } else {
        root.classList.remove('camera-open');
      }
    } catch (e) {
      // ignore (e.g., during SSR)
    }
    return () => {
      try { document.documentElement.classList.remove('camera-open'); } catch (e) {}
    };
  }, [isCameraOpen]);

  return (
    <CameraContext.Provider value={{
      isCameraOpen,
      setIsCameraOpen,
      captureCallback,
      setCaptureCallback,
      initialDataUrl,
      setInitialDataUrl,
      isEditing,
      setIsEditing,
      editCallback,
      setEditCallback,
    }}>
      {children}
    </CameraContext.Provider>
  );
}

export function useCameraContext() {
  const context = useContext(CameraContext);
  if (context === undefined) {
    throw new Error('useCameraContext must be used within a CameraProvider');
  }
  return context;
}