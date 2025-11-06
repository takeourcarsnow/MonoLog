import React from 'react';
import { collectInlineTokens } from './textTokens';

/**
 * Parse mentions from text and return array of usernames
 */
export function parseMentions(text: string): string[] {
  const tokens = collectInlineTokens(text);
  const names = tokens.filter(t => t.type === 'mention').map(t => t.value);
  return [...new Set(names)];
}

/**
 * Render text with mentions as links
 */
export function renderMentions(text: string): React.ReactNode {
  const tokens = collectInlineTokens(text);
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const t of tokens) {
    if (t.type !== 'mention') continue;
    if (t.start > lastIndex) parts.push(text.slice(lastIndex, t.start));
    const username = t.value;
    parts.push(
      <a
        key={t.start}
        href={`/profile/${username}`}
        className="mention-link"
        onClick={(e) => { e.stopPropagation(); }}
      >
        @{username}
      </a>
    );
    lastIndex = t.end;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts.length > 0 ? parts : text}</>;
}