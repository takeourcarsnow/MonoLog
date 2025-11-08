# Camera Effects Feature

## Overview

MonoLog now supports real-time camera effects when capturing photos! Users can apply visual effects like dithering, pixelation, and ASCII art directly in the camera view before taking the picture.

## Features

### Real-Time Effects
- **None**: Standard camera view with no effects
- **Pixelate**: Retro pixel art effect with adjustable size and shape (square/circle)
- **Dither**: Classic dithering effect with ordered or Floyd-Steinberg algorithms
- **ASCII Art**: Convert video to ASCII characters in real-time
- **Text Overlay**: Add custom text overlays with positioning, fonts, and styling

### Frames & Overlays
- **Decorative Frames**: Apply photo frames directly in the camera view
- **Texture Overlays**: Add light leaks, bokeh, and textures with blend modes
- **Real-time Preview**: See frames and overlays applied before capturing

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
- **Cell Size**: 10-50px character cells
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

#### Text Overlay
- **Text Content**: Custom text string to overlay on the image
- **Font Size**: 12-72px adjustable font size
- **Font Family**: Choose from Arial, Helvetica, Times New Roman, Georgia, Verdana, Courier New, Impact, Comic Sans MS
- **Text Color**: Color picker for text fill color
- **Position**: 9-position grid (top-left, center, bottom-right, etc.) or manual drag positioning
- **Manual Positioning**: Click and drag text directly on the camera preview to position anywhere
- **Reset Position**: Button to return to preset positions after manual positioning
- **Opacity**: 0-100% text transparency
- **Text Stroke**: Optional outline around text
- **Stroke Color**: Color picker for stroke color
- **Stroke Width**: 1-10px stroke thickness

#### Frames
- **Frame Selection**: Choose from available decorative frames
- **Toggle On/Off**: Click selected frame to remove it
- **Real-time Overlay**: Frame rendered on top of effects

#### Overlays
- **Overlay Selection**: Choose from light leaks, bokeh, and textures
- **Blend Modes**: Multiply, Screen, Overlay, Soft-light
- **Opacity Control**: Adjust overlay intensity (0-100%)
- **Toggle On/Off**: Click selected overlay to remove it

## Technical Implementation

### Files Created

1. **`cameraEffects.ts`** - Core effect rendering logic
   - Optimized for real-time video frame processing
   - Efficient canvas-based algorithms
   - Type-safe effect settings interface
   - Frame overlay rendering with bounds detection
   - Overlay rendering with blend modes

2. **`LiveCameraView.tsx`** - Camera UI component
   - Uses `getUserMedia` API for camera access
   - Real-time rendering loop with `requestAnimationFrame`
   - Separate source and display canvases for performance
   - Effect parameter controls
   - Collapsible frames and overlays panels
   - Real-time preview of all effects and overlays

### Architecture

```
Video Stream → Source Canvas → Effect Processing → Overlay/Frame → Display Canvas → User View
                    ↓                    ↓              ↓                 ↓
              Raw frames          Effects applied   Layers added    Final output
```

### Rendering Order

1. **Base Effect**: Pixelate, Dither, ASCII, or Text applied to source frame
2. **Overlay Layer**: Texture/light leak with blend mode (e.g., screen, multiply)
3. **Frame Layer**: Decorative frame rendered on top with transparency

This order ensures effects are visible through frames and overlays enhance the processed image.

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
3. Select desired effect from buttons (None/Pixel/Dither/ASCII/Text)
4. Adjust effect parameters using controls
5. For text overlay: Enter text, adjust styling, then click and drag on the camera preview to position text anywhere
6. Optionally add a decorative frame from the Frames section
7. Optionally add texture overlays from the Overlays section (with blend mode and opacity controls)
8. Click "Capture" to take photo with all effects and overlays applied
9. Photo is captured with effects, overlays, and frames permanently rendered

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
- Frame opacity control
- Custom frame upload
- More blend modes for overlays

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
