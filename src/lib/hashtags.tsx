import React from 'react';

/**
 * Parse hashtags from text and return array of tags
 */
export function parseHashtags(text: string): string[] {
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
  const hashtags: string[] = [];
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }
  return [...new Set(hashtags)]; // deduplicate
}

/**
 * Render text with hashtags and mentions as links
 */
export function renderCaption(text: string): React.ReactNode {
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const matches: Array<{ index: number; end: number; type: 'hashtag' | 'mention' | 'url'; value: string }> = [];

  // Collect all matches
  let match;

  // URLs first
  while ((match = urlRegex.exec(text)) !== null) {
    matches.push({ index: match.index, end: match.index + match[0].length, type: 'url', value: match[0] });
  }
  urlRegex.lastIndex = 0;

  // Hashtags
  while ((match = hashtagRegex.exec(text)) !== null) {
    matches.push({ index: match.index, end: match.index + match[0].length, type: 'hashtag', value: match[1].toLowerCase() });
  }
  hashtagRegex.lastIndex = 0; // reset

  // Mentions
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
          href={`/hashtags/${encodeURIComponent(m.value)}`}
          className="hashtag-link"
          onClick={(e) => {
            e.stopPropagation();
          }}
          aria-label={`View posts tagged with #${m.value}`}
        >
          #{m.value}
        </a>
      );
    } else {
      if (m.type === 'mention') {
        parts.push(
          <a
            key={`${m.type}-${m.index}`}
            href={`/profile/${m.value}`}
            className="mention-link"
            onClick={(e) => {
              e.stopPropagation();
            }}
            aria-label={`View profile of @${m.value}`}
          >
            @{m.value}
          </a>
        );
      } else if (m.type === 'url') {
        const href = m.value;
        // Display shorter text for very long urls
        const display = href.length > 60 ? href.slice(0, 50) + '…' : href;
        parts.push(
          <a
            key={`${m.type}-${m.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
            onClick={(e) => { e.stopPropagation(); }}
            aria-label={`Open ${href} in a new tab`}
          >
            {display}
          </a>
        );
      }
    }
    lastIndex = m.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
}