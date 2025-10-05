import React from 'react';

interface ImageEditorCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  mounted: boolean;
}

export default function ImageEditorCanvas({ canvasRef, mounted }: ImageEditorCanvasProps) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          touchAction: 'none',
          display: 'block',
          transition: 'box-shadow 240ms ease',
          minHeight: 140,
          maxHeight: 'min(50vh, 520px)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.05)',
          border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)'
        }}
      />
    </div>
  );
}
