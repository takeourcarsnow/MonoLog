import { CameraEffectSettings } from "./cameraEffects";
import { CameraControls } from "./CameraControls";
import { CameraError } from "./CameraError";
import { CameraLoading } from "./CameraLoading";
import { CameraProcessingOverlay } from "./CameraProcessingOverlay";
import { ImagePlus } from 'lucide-react';

interface LiveCameraCanvasProps {
  videoRef: any;
  sourceCanvasRef: any;
  displayCanvasRef: any;
  fileInputRef: any;
  inlineEditRef: any;
  effectSettings: CameraEffectSettings;
  disabled: boolean;
  controlsDisabled: boolean;
  cameraReady: boolean;
  isCapturing: boolean;
  processing: boolean;
  zoom: number;
  overlayVisible: boolean;
  isSwitchingCamera: boolean;
  showProcessingOverlay: boolean;
  error: string | null;
  isPreviewing: boolean;
  isInlineEditing: boolean;
  inlineEditText: string;
  switchCamera: () => void;
  openFilePicker: () => void;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  handleCapture: () => void;
  handleClose: () => void;
  confirmCapture: () => void;
  retakeCapture: () => void;
  startCameraEnhanced: () => void;
  startRenderLoop: (effectSettings: CameraEffectSettings, isCapturing: boolean, videoRef: any, streamRef: any, applyZoom?: (canvas: HTMLCanvasElement) => void) => void;
  streamRef: any;
  applyZoom: (canvas: HTMLCanvasElement) => void;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  handleTouchStartEnhanced: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  handleTouchMoveEnhanced: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  handleTouchEndEnhanced: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  handleInlineEditChange: (value: string) => void;
  handleInlineEditBlur: () => void;
  handleInlineEditKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  setIsInlineEditing: (editing: boolean) => void;
  setInlineEditText: (text: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  isModal: boolean;
}

export function LiveCameraCanvas({
  videoRef,
  sourceCanvasRef,
  displayCanvasRef,
  fileInputRef,
  inlineEditRef,
  effectSettings,
  disabled,
  controlsDisabled,
  cameraReady,
  isCapturing,
  processing,
  zoom,
  overlayVisible,
  isSwitchingCamera,
  showProcessingOverlay,
  error,
  isPreviewing,
  isInlineEditing,
  inlineEditText,
  switchCamera,
  openFilePicker,
  setZoom,
  handleCapture,
  handleClose,
  confirmCapture,
  retakeCapture,
  startCameraEnhanced,
  startRenderLoop,
  streamRef,
  applyZoom,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleWheel,
  handleTouchStartEnhanced,
  handleTouchMoveEnhanced,
  handleTouchEndEnhanced,
  handleInlineEditChange,
  handleInlineEditBlur,
  handleInlineEditKeyDown,
  setIsInlineEditing,
  setInlineEditText,
  handleFileChange,
  onClose,
  isModal,
}: LiveCameraCanvasProps) {
  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: isModal ? 6 : 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      {/* Hidden video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* Hidden source canvas (for capturing raw frames) */}
      <canvas ref={sourceCanvasRef} style={{ display: 'none' }} />

      {/* Display canvas (shows effects) */}
      <canvas
        ref={displayCanvasRef}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: isModal ? 6 : 0,
          filter: showProcessingOverlay ? 'blur(8px) brightness(0.7)' : 'none',
          transition: 'filter 0.2s ease',
          touchAction: 'none', // Prevent default touch behaviors
          cursor: effectSettings.type === 'text' && effectSettings.textContent && !disabled ? 'move' : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={(e: React.MouseEvent<HTMLCanvasElement>) => {
          if (effectSettings.type === 'text' && effectSettings.textContent && !disabled) {
            e.preventDefault();
            setIsInlineEditing(true);
            setInlineEditText(effectSettings.textContent);
            // Focus the textarea after it's rendered
            setTimeout(() => {
              if (inlineEditRef.current) {
                inlineEditRef.current.focus();
                inlineEditRef.current.select();
              }
            }, 0);
          }
        }}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right click
        onTouchStart={handleTouchStartEnhanced}
        onTouchMove={handleTouchMoveEnhanced}
        onTouchEnd={handleTouchEndEnhanced}
        aria-label={`Live camera preview with ${effectSettings.type} effect applied`}
        role="img"
      />

      {/* Hidden file input for adding image from files */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Inline text editing overlay */}
      {isInlineEditing && effectSettings.type === 'text' && effectSettings.textContent && (
        <textarea
          ref={inlineEditRef}
          value={inlineEditText}
          onChange={(e) => handleInlineEditChange(e.target.value)}
          onBlur={handleInlineEditBlur}
          onKeyDown={handleInlineEditKeyDown}
          style={{
            position: 'absolute',
            left: `${((effectSettings.textX ?? 0.5) * 100)}%`,
            top: `${((effectSettings.textY ?? 0.5) * 100)}%`,
            transform: 'translate(-50%, -50%)',
            width: `${Math.max(100, (effectSettings.textFontSize || 40) * 6)}px`,
            minHeight: `${Math.max(30, (effectSettings.textFontSize || 40) * 1.2)}px`,
            fontSize: `${effectSettings.textFontSize || 40}px`,
            fontFamily: effectSettings.textFontFamily || 'Arial',
            fontWeight: 'bold',
            color: effectSettings.textColor || '#ffffff',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: '2px',
            padding: '2px 4px',
            resize: 'none',
            outline: 'none',
            zIndex: 10,
            textAlign: effectSettings.textAlign === 'center' ? 'center' : effectSettings.textAlign === 'right' ? 'right' : 'left',
            lineHeight: effectSettings.textLineHeight || 1.4,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(0,122,204,0.3)',
          }}
          rows={inlineEditText.split('\n').length}
          placeholder="Edit text..."
        />
      )}

      <CameraControls
        disabled={controlsDisabled}
        cameraReady={cameraReady}
        isCapturing={isCapturing}
        processing={processing}
        zoom={zoom}
        overlayVisible={overlayVisible}
        isSwitchingCamera={isSwitchingCamera}
        switchCamera={switchCamera}
        openFilePicker={openFilePicker}
        setZoom={setZoom}
        handleCapture={handleCapture}
        handleClose={handleClose}
        isPreviewing={isPreviewing}
        confirmCapture={confirmCapture}
        retakeCapture={() => {
          // Clear preview state
          retakeCapture();

          // Reset any inline CSS sizing applied to the canvases when previewing
          // (preview code sets explicit disp.style.width/height). Clearing
          // these ensures the live render loop can size the canvas to the
          // camera feed and restore correct aspect ratio.
          try {
            const disp = displayCanvasRef.current;
            const src = sourceCanvasRef.current;
            if (disp) {
              // Restore to default responsive sizing used initially
              disp.style.width = '100%';
              disp.style.height = 'auto';
              disp.style.display = 'block';
            }
            if (src) {
              src.style.width = '';
              src.style.height = '';
            }
          } catch (e) {
            // ignore
          }

          // Restart camera and render loop
          startCameraEnhanced();
          startRenderLoop(effectSettings, false, videoRef, streamRef, applyZoom);
        }}
      />

      {/* Add from files button - always visible in left bottom corner */}
      <button
        onClick={openFilePicker}
        disabled={disabled}
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 4,
        }}
        aria-label="Add from files"
        title="Add image from files"
      >
        <ImagePlus size={16} />
      </button>

      <CameraError error={error} startCameraEnhanced={startCameraEnhanced} onClose={onClose} />

      <CameraLoading cameraReady={cameraReady} error={error} />

      <CameraProcessingOverlay showProcessingOverlay={showProcessingOverlay} />

      {/* Preview is rendered into the display canvas so effects can be applied live. */}
    </div>
  );
}