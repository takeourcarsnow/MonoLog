import React from 'react';

interface ImageEditorCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  mounted: boolean;
}

export default function ImageEditorCanvas({ canvasRef, mounted }: ImageEditorCanvasProps) {
  // Check if we're in full-screen mode by looking up the DOM tree
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  
  React.useEffect(() => {
    const checkFullscreen = () => {
      const fullscreenElement = document.querySelector('.upload-editor-fullscreen');
      setIsFullscreen(!!fullscreenElement);
    };
    
    checkFullscreen();
    
    // Check again after a short delay to ensure DOM is ready
    const timeout = setTimeout(checkFullscreen, 100);
    
    return () => clearTimeout(timeout);
  }, []);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          touchAction: 'none',
          display: 'block',
          transition: 'box-shadow 240ms ease',
          borderRadius: 12,
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)',
          border: 'none',
          background: isFullscreen ? 'var(--bg)' : 'var(--bg-elev)',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
    </div>
  );
}
