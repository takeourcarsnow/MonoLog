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
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          display: 'block',
          transition: 'box-shadow 240ms ease',
          borderRadius: 12,
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)',
          border: 'none',
          background: isFullscreen ? 'var(--bg)' : 'var(--bg-elev)'
        }}
      />
    </div>
  );
}
