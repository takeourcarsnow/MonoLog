"use client";

import { useState } from "react";
import { renderCaption } from "@/src/lib/hashtags";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CaptionDisplayProps {
  caption: string;
  maxLength?: number;
  isAuthed?: boolean;
  onSignIn?: () => void;
}

export function CaptionDisplay({ caption, maxLength = 50, isAuthed = true, onSignIn }: CaptionDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!caption) return null;

  const effectiveMaxLength = isAuthed ? maxLength : Math.min(maxLength, 30);
  const shouldTruncate = caption.length > effectiveMaxLength;

  // Always render the full caption content. Use CSS to visually clamp when
  // collapsed. Swapping the text content (short vs full) can interrupt the
  // max-height transition, so this keeps the DOM height consistent and lets
  // the CSS transition animate smoothly both opening and closing.
  return (
    <div 
      className="caption" 
      aria-live="polite"
      onClick={() => shouldTruncate && (isAuthed ? setIsExpanded(!isExpanded) : onSignIn?.())}
      style={{ cursor: shouldTruncate ? 'pointer' : 'default' }}
    >
      <div className={`caption-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="caption-inner">{renderCaption(caption)}</div>
        {/* subtle gradient hint at the bottom when collapsed */}
        {shouldTruncate && <div className="caption-fade" aria-hidden="true" />}
      </div>
      {shouldTruncate && (
        <button
          type="button"
          className="caption-read-more"
          onClick={(e) => {
            e.stopPropagation();
            if (isAuthed) {
              setIsExpanded(!isExpanded);
            } else {
              onSignIn?.();
            }
          }}
          aria-expanded={isAuthed ? isExpanded : undefined}
          aria-label={isAuthed ? (isExpanded ? "Show less" : "Read more") : "Sign in to read more"}
        >
          {isAuthed ? (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : "Sign in to read more"}
        </button>
      )}
    </div>
  );
}