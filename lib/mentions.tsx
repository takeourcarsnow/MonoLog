import React from 'react';

/**
 * Parse mentions from text and return array of usernames
 */
export function parseMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)]; // deduplicate
}

/**
 * Render text with mentions as links
 */
export function renderMentions(text: string): React.ReactNode {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the mention as a link
    const username = match[1];
    parts.push(
      <a
        key={match.index}
        href={`/profile/${username}`}
        className="mention-link"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        @{username}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // Return a React node: if we built any parts (with links) return them,
  // otherwise return the original text. Wrapping both branches in a
  // fragment keeps the return type consistent as ReactNode.
  return <>{parts.length > 0 ? parts : text}</>;
}