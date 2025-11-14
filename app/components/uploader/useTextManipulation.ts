"use client";

import { useRef, useCallback, useState } from "react";

export function useTextManipulation(setEffectSettings: React.Dispatch<React.SetStateAction<any>>, disabled: boolean, effectSettings: any) {
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [isManipulatingText, setIsManipulatingText] = useState(false);

  // Text drag and rotation handlers with throttling for better performance
  const dragUpdateRef = useRef<{ x: number; y: number } | null>(null);
  const rotationUpdateRef = useRef<number | undefined>(undefined);
  const scaleUpdateRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | null>(null);
  const initialRotationRef = useRef<number>(0);
  const initialTouchAngleRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const initialDistanceRef = useRef<number>(0);

  const updateDragPosition = useCallback(() => {
    if (dragUpdateRef.current) {
      const { x, y } = dragUpdateRef.current;
      setEffectSettings((prev: any) => ({
        ...prev,
        textX: x,
        textY: y,
      }));
      dragUpdateRef.current = null;
    }
    if (rotationUpdateRef.current !== undefined) {
      setEffectSettings((prev: any) => ({
        ...prev,
        textRotation: rotationUpdateRef.current,
      }));
      rotationUpdateRef.current = undefined;
    }
    if (scaleUpdateRef.current !== undefined) {
      setEffectSettings((prev: any) => ({
        ...prev,
        textScale: scaleUpdateRef.current,
      }));
      scaleUpdateRef.current = undefined;
    }
    rafRef.current = null;
  }, [setEffectSettings]);

  const throttledSetDragPosition = useCallback((x: number, y: number) => {
    dragUpdateRef.current = { x, y };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(updateDragPosition);
    }
  }, [updateDragPosition]);

  const throttledSetRotation = useCallback((rotation: number) => {
    rotationUpdateRef.current = rotation;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(updateDragPosition);
    }
  }, [updateDragPosition]);

  const throttledSetScale = useCallback((scale: number) => {
    scaleUpdateRef.current = scale;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(updateDragPosition);
    }
  }, [updateDragPosition]);

  // Helper function to calculate angle between two points
  const getAngle = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / rect.width;
      const clickY = (e.clientY - rect.top) / rect.height;

      // Calculate text bounds (normalized coordinates)
      const textX = effectSettings.textX ?? 0.5;
      const textY = effectSettings.textY ?? 0.5;
      const fontSize = effectSettings.textFontSize || 40;
      const textWidth = Math.max(100, fontSize * 6) / rect.width; // normalized width
      const textHeight = Math.max(30, fontSize * 1.2) / rect.height; // normalized height

      // Check if click is within text bounds
      const textLeft = textX - textWidth / 2;
      const textRight = textX + textWidth / 2;
      const textTop = textY - textHeight / 2;
      const textBottom = textY + textHeight / 2;

      const isClickOnText = clickX >= textLeft && clickX <= textRight &&
                           clickY >= textTop && clickY <= textBottom;

      if (!isClickOnText) {
        return; // Don't start dragging if click is not on text
      }

      if (e.button === 0) { // Left click - drag
        setIsDraggingText(true);
        setDragStartX(clickX);
        setDragStartY(clickY);
        throttledSetDragPosition(clickX, clickY);
      } else if (e.button === 2) { // Right click - rotate
        e.preventDefault(); // Prevent context menu
        initialRotationRef.current = effectSettings.textRotation || 0;
        setIsDraggingText(true);
        setDragStartX(e.clientX);
        setDragStartY(e.clientY);
      }
    }
  }, [effectSettings.type, effectSettings.textContent, effectSettings.textX, effectSettings.textY, effectSettings.textFontSize, effectSettings.textRotation, disabled, setEffectSettings, setIsDraggingText, setDragStartX, setDragStartY, throttledSetDragPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingText && effectSettings.type === 'text') {
      if (e.buttons & 1) { // Left button held - drag
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        throttledSetDragPosition(x, y);
      } else if (e.buttons & 2) { // Right button held - rotate
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const newRotation = initialRotationRef.current + angle;

        throttledSetRotation(newRotation);
      }
    }
  }, [isDraggingText, effectSettings.type, dragStartX, dragStartY, throttledSetDragPosition, throttledSetRotation]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      e.preventDefault(); // Prevent context menu on right click release
    }
    setIsDraggingText(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Final update to ensure position and rotation are set
    if (dragUpdateRef.current || rotationUpdateRef.current !== undefined) {
      updateDragPosition();
    }
  }, [setIsDraggingText, updateDragPosition]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -2 : 2; // Scale down on scroll down, up on scroll up
      const newSize = Math.max(12, Math.min(120, (effectSettings.textFontSize || 24) + delta));
      setEffectSettings((prev: any) => ({
        ...prev,
        textFontSize: newSize,
      }));
    }
  }, [effectSettings.type, effectSettings.textContent, effectSettings.textFontSize, disabled, setEffectSettings]);

  // Enhanced touch handlers for text dragging and rotation with throttling
  const handleTouchStartEnhanced = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    // Handle text dragging and rotation
    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches[0];
      const touchX = (touch.clientX - rect.left) / rect.width;
      const touchY = (touch.clientY - rect.top) / rect.height;

      // Calculate text bounds (normalized coordinates)
      const textX = effectSettings.textX ?? 0.5;
      const textY = effectSettings.textY ?? 0.5;
      const fontSize = effectSettings.textFontSize || 40;
      const textWidth = Math.max(100, fontSize * 6) / rect.width; // normalized width
      const textHeight = Math.max(30, fontSize * 1.2) / rect.height; // normalized height

      // Check if touch is within text bounds
      const textLeft = textX - textWidth / 2;
      const textRight = textX + textWidth / 2;
      const textTop = textY - textHeight / 2;
      const textBottom = textY + textHeight / 2;

      const isTouchOnText = touchX >= textLeft && touchX <= textRight &&
                           touchY >= textTop && touchY <= textBottom;

      if (!isTouchOnText) {
        return; // Don't start manipulating if touch is not on text
      }

      setIsManipulatingText(true);
      if (e.touches.length === 1) {
        // Single touch - drag
        setIsDraggingText(true);
        setDragStartX(touchX);
        setDragStartY(touchY);
        throttledSetDragPosition(touchX, touchY);
      } else if (e.touches.length === 2) {
        // Two touches - rotation and scaling
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        // Store initial rotation and touch angle
        initialRotationRef.current = effectSettings.textRotation || 0;
        initialTouchAngleRef.current = getAngle(
          touch1.clientX - rect.left, touch1.clientY - rect.top,
          touch2.clientX - rect.left, touch2.clientY - rect.top
        );

        // Store initial scale and distance
        initialScaleRef.current = effectSettings.textScale || 1;
        initialDistanceRef.current = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );

        // Also set position to center of rotation
        const x = (centerX - rect.left) / rect.width;
        const y = (centerY - rect.top) / rect.height;
        throttledSetDragPosition(x, y);
      }
    }
  }, [effectSettings.type, effectSettings.textContent, effectSettings.textX, effectSettings.textY, effectSettings.textFontSize, effectSettings.textRotation, effectSettings.textScale, disabled, setEffectSettings, setIsManipulatingText, setIsDraggingText, setDragStartX, setDragStartY, throttledSetDragPosition, getAngle]);

  const handleTouchMoveEnhanced = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    // Handle text dragging, rotation, and scaling
    if (effectSettings.type === 'text' && effectSettings.textContent && !disabled && isManipulatingText) {
      if (e.touches.length === 1 && isDraggingText) {
        // Single touch - drag
        const rect = e.currentTarget.getBoundingClientRect();
        const touch = e.touches[0];
        const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));

        throttledSetDragPosition(x, y);
      } else if (e.touches.length === 2) {
        // Two touches - rotation and scaling
        const rect = e.currentTarget.getBoundingClientRect();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // Handle rotation
        const currentAngle = getAngle(
          touch1.clientX - rect.left, touch1.clientY - rect.top,
          touch2.clientX - rect.left, touch2.clientY - rect.top
        );

        const angleDiff = currentAngle - initialTouchAngleRef.current;
        const newRotation = initialRotationRef.current + angleDiff;

        throttledSetRotation(newRotation);

        // Handle scaling
        const currentDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );

        const scaleDiff = currentDistance / initialDistanceRef.current;
        const newScale = Math.max(0.1, Math.min(5, initialScaleRef.current * scaleDiff));

        throttledSetScale(newScale);

        // Also update position to center of rotation/scaling
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const x = Math.max(0, Math.min(1, (centerX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (centerY - rect.top) / rect.height));
        throttledSetDragPosition(x, y);
      }
    }
  }, [effectSettings.type, effectSettings.textContent, disabled, isDraggingText, isManipulatingText, throttledSetDragPosition, getAngle, throttledSetRotation, throttledSetScale]);

  const handleTouchEndEnhanced = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDraggingText(false);
    setIsManipulatingText(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Final update to ensure position, rotation, and scale are set
    if (dragUpdateRef.current || rotationUpdateRef.current !== undefined || scaleUpdateRef.current !== undefined) {
      updateDragPosition();
    }
  }, [setIsDraggingText, setIsManipulatingText, updateDragPosition]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    // Cancel any pending RAF updates
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Clear drag, rotation, and scale state
    dragUpdateRef.current = null;
    rotationUpdateRef.current = undefined;
    scaleUpdateRef.current = undefined;
    initialRotationRef.current = 0;
    initialTouchAngleRef.current = 0;
    initialScaleRef.current = 1;
    initialDistanceRef.current = 0;
  }, []);

  return {
    isDraggingText,
    isManipulatingText,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStartEnhanced,
    handleTouchMoveEnhanced,
    handleTouchEndEnhanced,
    cleanup,
  };
}