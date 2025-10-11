"use client";

import { useState } from "react";
import { renderMentions } from "@/src/lib/mentions";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CaptionDisplayProps {
  caption: string;
  maxLength?: number;
}

export function CaptionDisplay({ caption, maxLength = 50 }: CaptionDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!caption) return null;

  const shouldTruncate = caption.length > maxLength;

  // Always render the full caption content. Use CSS to visually clamp when
  // collapsed. Swapping the text content (short vs full) can interrupt the
  // max-height transition, so this keeps the DOM height consistent and lets
  // the CSS transition animate smoothly both opening and closing.
  return (
    <div className="caption" aria-live="polite">
      <div className={`caption-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="caption-inner">{renderMentions(caption)}</div>
        {/* subtle gradient hint at the bottom when collapsed */}
        {shouldTruncate && <div className="caption-fade" aria-hidden="true" />}
      </div>
      {shouldTruncate && (
        <button
          type="button"
          className="caption-read-more"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Show less" : "Read more"}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}
    </div>
  );
}