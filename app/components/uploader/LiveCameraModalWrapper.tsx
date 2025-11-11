"use client";

import React from "react";
import Portal from "@/app/components/ui/Portal";

interface LiveCameraModalWrapperProps {
  isModal: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function LiveCameraModalWrapper({ isModal, onClose, children }: LiveCameraModalWrapperProps) {
  if (isModal) {
    return (
      <Portal>
        <div
          role="dialog"
          aria-modal={true}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            zIndex: 20,
            overflowY: 'auto',
          }}
          onClick={onClose}
        >
          {children}
        </div>
      </Portal>
    );
  } else {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        {children}
      </div>
    );
  }
}