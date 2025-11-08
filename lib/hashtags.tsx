import React from 'react';
import { collectInlineTokens } from './textTokens';

/**
 * Parse hashtags from text and return array of tags
 */
export function parseHashtags(text: string): string[] {
  const tokens = collectInlineTokens(text);
  const tags = tokens.filter(t => t.type === 'hashtag').map(t => t.value.toLowerCase());
  return [...new Set(tags)];
}

/**
 * Render text with hashtags and mentions as links
 */
export function renderCaption(text: string): React.ReactNode {
  const tokens = collectInlineTokens(text);
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const m of tokens) {
    // Add text before
    if (m.start > lastIndex) {
      parts.push(text.slice(lastIndex, m.start));
    }
    // Add link
    if (m.type === 'hashtag') {
      parts.push(
        <a
          key={`${m.type}-${m.start}`}
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
    } else if (m.type === 'mention') {
        parts.push(
          <a
            key={`${m.type}-${m.start}`}
            href={`/${m.value}`}
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
        // Normalize URL to include protocol
        let href = m.value;
        if (!href.startsWith('http') && !href.startsWith('//')) {
          href = `//${href}`;
        }
        // Display shorter text for very long urls
        const display = m.value.length > 60 ? m.value.slice(0, 50) + '…' : m.value;
        parts.push(
          <a
            key={`${m.type}-${m.start}`}
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
    lastIndex = m.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
}