# Camera Effects Feature

## Overview

MonoLog now supports real-time camera effects when capturing photos! Users can apply visual effects like dithering, pixelation, and ASCII art directly in the camera view before taking the picture.

## Features

### Real-Time Effects
- **None**: Standard camera view with no effects
- **Pixelate**: Retro pixel art effect with adjustable size and shape (square/circle)
- **Dither**: Classic dithering effect with ordered or Floyd-Steinberg algorithms
- **ASCII Art**: Convert video to ASCII characters in real-time

### Effect Controls

Each effect has customizable parameters matching the full image editor:

#### Pixelate
- **Pixel Size**: 2-32px (adjustable slider)
- **Pixel Shape**: Square or Circle blocks

#### Dither
- **Levels**: 2-8 levels of quantization
- **Color Mode**: Black & White or Color dithering
- **Method**: Floyd-Steinberg, Ordered (Bayer), Atkinson, or Burkes
- **Color Palettes** (when Color mode selected):
  - Auto (standard quantization)
  - Game Boy (4-color green palette)
  - PICO-8 (16-color fantasy console palette)
  - NES (54-color palette)
  - ZX Spectrum (16-color palette)
  - Atari 2600 (16-color palette)
  - Commodore 64 (16-color palette)
  - Apple II (16-color palette)

#### ASCII
- **Cell Size**: 4-20px character cells
- **Charset**: Custom character string or presets
- **Character Presets**:
  - Custom: ` .:-=+*#%@`
  - Dense: Full alphanumeric + symbols
  - Sparse: `@%#*:. `
  - Blocks: `█▓▒░ `
  - Dots: `●◉○· `
  - Lines: `│─┼┌┐└┘`
  - Numbers: `0123456789`
  - Letters: `ABCDEFGHIJKLMNOPQRSTUVWXYZ`
- **Invert**: Normal or inverted brightness mapping
- **Color Mode**: Colored characters based on sampled pixel colors

## Technical Implementation

### Files Created

1. **`cameraEffects.ts`** - Core effect rendering logic
   - Optimized for real-time video frame processing
   - Efficient canvas-based algorithms
   - Type-safe effect settings interface

2. **`LiveCameraView.tsx`** - Camera UI component
   - Uses `getUserMedia` API for camera access
   - Real-time rendering loop with `requestAnimationFrame`
   - Separate source and display canvases for performance
   - Effect parameter controls

### Architecture

```
Video Stream → Source Canvas → Effect Processing → Display Canvas → User View
                    ↓                                      ↓
              Raw frames                            Processed frames
```

### Performance Optimizations

- **Dual Canvas System**: Separate canvases for source and display prevent redundant processing
- **Efficient Algorithms**: Ordered dithering (faster) as default over Floyd-Steinberg
- **Context Flags**: `willReadFrequently: true` optimization for frequent pixel reads
- **Frame-based Processing**: Effects applied per frame, not per pixel update

### Browser Compatibility

- **Modern Browsers**: Full support with `getUserMedia` API
- **Fallback**: Traditional file input with `capture="environment"` for older browsers
- **Progressive Enhancement**: Feature detection automatically selects best method

## Usage

### User Flow

1. Click camera button in upload screen
2. Grant camera permissions (if needed)
3. Select desired effect from buttons (None/Pixel/Dither/ASCII)
4. Adjust effect parameters using controls
5. Click "Capture" to take photo with effect applied
6. Photo is captured with effect permanently rendered

### Developer Integration

The live camera automatically activates when:
- Browser supports `navigator.mediaDevices.getUserMedia`
- User clicks camera button in uploader
- Falls back to traditional file input if API not available

```typescript
// Check in UploaderCore.tsx
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  setLiveCameraOpen(true);
} else {
  // Fallback to file input
  cameraInputRef.current?.click();
}
```

## Future Enhancements

Potential improvements:
- Additional effect presets (sepia, vintage, etc.)
- Custom color palettes for dithering
- Effect intensity/strength slider
- Camera switching (front/back)
- Flash control
- Video recording with effects
- Effect preview thumbnails
- Save/load custom effect presets

## Dependencies

- React hooks (useState, useRef, useEffect, useCallback)
- Canvas API for image processing
- MediaDevices API for camera access
- Lucide icons for UI elements

## Performance Notes

- Effect processing is optimized for ~30fps on modern mobile devices
- ASCII effect is most computationally intensive
- Dithering with Floyd-Steinberg is slower but higher quality than ordered
- Circular pixels require more processing than square pixels
