"use client";

import { useRef, useCallback, useState } from "react";

export function useInlineEditing(setEffectSettings: React.Dispatch<React.SetStateAction<any>>) {
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineEditText, setInlineEditText] = useState('');
  const inlineEditRef = useRef<HTMLTextAreaElement>(null);

  const handleInlineEditChange = useCallback((value: string) => {
    setInlineEditText(value);
    setEffectSettings((prev: any) => ({
      ...prev,
      textContent: value,
    }));
  }, [setEffectSettings]);

  const handleInlineEditBlur = useCallback(() => {
    setIsInlineEditing(false);
  }, []);

  const handleInlineEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsInlineEditing(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Revert changes on escape
      setEffectSettings((prev: any) => ({
        ...prev,
        textContent: inlineEditText,
      }));
      setIsInlineEditing(false);
    }
  }, [inlineEditText, setEffectSettings]);

  const startInlineEditing = useCallback((text: string) => {
    setIsInlineEditing(true);
    setInlineEditText(text);
    // Focus the textarea after it's rendered
    setTimeout(() => {
      if (inlineEditRef.current) {
        inlineEditRef.current.focus();
        inlineEditRef.current.select();
      }
    }, 0);
  }, []);

  return {
    isInlineEditing,
    inlineEditText,
    inlineEditRef,
    handleInlineEditChange,
    handleInlineEditBlur,
    handleInlineEditKeyDown,
    startInlineEditing,
    setIsInlineEditing,
    setInlineEditText,
  };
}