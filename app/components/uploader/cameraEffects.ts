/**
 * Camera Effects - Main Module
 *
 * Orchestrates real-time video frame processing effects
 */

import { CameraEffectSettings, CameraEffectType, DEFAULT_ASCII_CHARSET } from './cameraEffectsTypes';
import { applyUnifiedEffects } from './unifiedEffects';

// Re-export types for convenience
export type { CameraEffectType, CameraEffectSettings };

// Main function to apply selected effect
export function applyCameraEffect(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  settings: CameraEffectSettings
): void {
  // Use the unified effects function for all processing
  applyUnifiedEffects(sourceCanvas, targetCanvas, settings);
}