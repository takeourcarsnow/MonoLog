import React from 'react';

/**
 * Parse hashtags from text and return array of tags
 */
export function parseHashtags(text: string): string[] {
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const hashtags: string[] = [];
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }
  return [...new Set(hashtags)]; // deduplicate
}

/**
 * Render text with hashtags and mentions as links
 */
export function renderCaption(text: string): React.ReactNode {
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const matches: Array<{ index: number; end: number; type: 'hashtag' | 'mention'; value: string }> = [];

  // Collect all matches
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    matches.push({ index: match.index, end: match.index + match[0].length, type: 'hashtag', value: match[1] });
  }
  hashtagRegex.lastIndex = 0; // reset
  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push({ index: match.index, end: match.index + match[0].length, type: 'mention', value: match[1] });
  }

  // Sort by index
  matches.sort((a, b) => a.index - b.index);

  for (const m of matches) {
    // Add text before
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    // Add link
    if (m.type === 'hashtag') {
      parts.push(
        <a
          key={`${m.type}-${m.index}`}
          href={`/hashtags/${m.value}`}
          className="hashtag-link"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          #{m.value}
        </a>
      );
    } else {
      parts.push(
        <a
          key={`${m.type}-${m.index}`}
          href={`/profile/${m.value}`}
          className="mention-link"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          @{m.value}
        </a>
      );
    }
    lastIndex = m.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
}