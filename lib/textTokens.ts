export type InlineToken = {
  type: 'url' | 'hashtag' | 'mention';
  value: string;
  start: number;
  end: number;
};

// Collect URL/hashtag/mention matches in a single pass with stable precedence:
// 1) URLs, then hashtags, then mentions. Later categories won't override earlier
// categories if ranges overlap (e.g., a hashtag inside a URL is ignored).
export function collectInlineTokens(text: string): InlineToken[] {
  const matches: InlineToken[] = [];
  if (!text) return matches;

  const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*/gi;
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;

  const addNonOverlapping = (list: InlineToken[], token: InlineToken) => {
    // Avoid adding if overlaps any existing token
    for (const t of list) {
      if (!(token.end <= t.start || token.start >= t.end)) return; // overlap
    }
    list.push(token);
  };

  // URLs first (highest precedence)
  let m: RegExpExecArray | null;
  while ((m = urlRegex.exec(text)) !== null) {
    addNonOverlapping(matches, { type: 'url', value: m[0], start: m.index, end: m.index + m[0].length });
  }
  // Hashtags
  while ((m = hashtagRegex.exec(text)) !== null) {
    addNonOverlapping(matches, { type: 'hashtag', value: m[1].toLowerCase(), start: m.index, end: m.index + m[0].length });
  }
  // Mentions
  while ((m = mentionRegex.exec(text)) !== null) {
    addNonOverlapping(matches, { type: 'mention', value: m[1], start: m.index, end: m.index + m[0].length });
  }

  // Sort by position
  matches.sort((a, b) => a.start - b.start);
  return matches;
}
