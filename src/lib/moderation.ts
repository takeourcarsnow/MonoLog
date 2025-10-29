// Improved automod: score-based, normalizes leet/diacritics, and returns
// structured reasons. Designed to be synchronous and small.

export type ModerationResult = {
  action: 'allow' | 'reject' | 'flag';
  score: number; // higher score = more likely to be problematic
  reasons: string[]; // list of heuristics triggered
};

// Scoring configuration
const SCORES = {
  banned_word: 80,
  multiple_links: 40,
  long_url: 25,
  repeated_chars: 40,
  repetition: 45,
  link_only: 20,
  short_exclaim: 10,
  shouting: 8,
  lots_symbols: 12,
} as const;

// Expanded (but still compact) banned words. Keep this list under
// project control — it's intentionally conservative here.
const BANNED_WORDS = [
  // Direct profanity, sexual terms, and slurs only
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'damn', 'slut', 'dick', 'piss', 'crap', 'cock', 'pussy', 'cunt', 'twat', 'prick', 'wank', 'bollocks', 'bugger', 'arse', 'shag', 'tit', 'whore', 'motherfucker', 'fucker', 'shithead', 'shitface', 'douche', 'douchebag', 'cum', 'balls', 'nuts', 'fag', 'faggot', 'dyke', 'homo', 'queer', 'tranny', 'rape', 'rapist', 'molest', 'molester', 'pedophile', 'pedo', 'nigger', 'negro', 'chink', 'gook', 'spic', 'wetback', 'beaner', 'coon', 'towelhead', 'camel jockey', 'raghead', 'kike', 'hebe', 'yid', 'gypsy', 'gyp', 'retard', 'retarded'
];

// Map common leet substitution back to letters so "5h1t" becomes "shit"
const LEET_MAP: [RegExp, string][] = [
  [/4/g, 'a'], [/@/g, 'a'], [/3/g, 'e'], [/1/g, 'i'], [/!/g, 'i'], [/0/g, 'o'], [/\$/g, 's'], [/7/g, 't'], [/\+/g, 't']
];

function normalizeText(s: string) {
  let out = s.normalize('NFKD').replace(/\p{Diacritic}/gu, '');
  out = out.toLowerCase();
  for (const [re, r] of LEET_MAP) out = out.replace(re, r);
  // collapse repeated punctuation and whitespace
  out = out.replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  return out;
}

function checkBannedWords(norm: string): string | null {
  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i');
    if (re.test(norm)) return 'banned_word';
  }
  return null;
}

function checkUrls(raw: string): string[] {
  const reasons: string[] = [];
  const urlRe = /https?:\/\/[\w\-\._~:\/?#\[\]@!$&'()*+,;=%]+/gi;
  const urls = (raw.match(urlRe) || []);
  if (urls.length >= 2) reasons.push('multiple_links');
  if (urls.some(u => u.length > 100)) reasons.push('long_url');
  return reasons;
}

function checkRepetition(norm: string): string[] {
  const reasons: string[] = [];
  if (/([a-z])\1{6,}/i.test(norm)) reasons.push('repeated_chars');
  const tokens = norm.split(/\s+/).filter(Boolean);
  const counts: Record<string, number> = {};
  for (const t of tokens) {
    counts[t] = (counts[t] || 0) + 1;
  }
  if (Object.values(counts).some(count => count >= 6)) reasons.push('repetition');
  return reasons;
}

function checkLinkOnly(raw: string, norm: string, urls: string[]): string | null {
  const nonPunct = norm.replace(/[\p{P}\p{S}]/gu, '').replace(/\s+/g, '').trim();
  if (nonPunct.length < 6 && urls.length === 1) return 'link_only';
  return null;
}

function checkShortAndShouty(raw: string): string[] {
  const reasons: string[] = [];
  if (raw.length < 6 && /[!]{2,}/.test(raw)) reasons.push('short_exclaim');
  if (raw.length < 10 && raw === raw.toUpperCase() && /[A-Z]/.test(raw)) reasons.push('shouting');
  return reasons;
}

function checkSymbols(raw: string): string | null {
  const nonAlnum = (raw.match(/[^\p{L}\p{N}\s]/gu) || []).length;
  if (nonAlnum > Math.min(30, Math.max(5, Math.floor(raw.length / 6)))) return 'lots_symbols';
  return null;
}

export function checkComment(text: string): ModerationResult {
  if (!text || !text.trim()) {
    return { action: 'reject', score: 100, reasons: ['empty'] };
  }

  const raw = text;
  const norm = normalizeText(raw);
  const reasonsSet: Set<string> = new Set();
  let score = 0;

  // Run all checks
  const banned = checkBannedWords(norm);
  if (banned) {
    reasonsSet.add(banned);
    score += SCORES[banned as keyof typeof SCORES];
  }

  const urlReasons = checkUrls(raw);
  urlReasons.forEach(reason => {
    reasonsSet.add(reason);
    score += SCORES[reason as keyof typeof SCORES];
  });

  const repReasons = checkRepetition(norm);
  repReasons.forEach(reason => {
    reasonsSet.add(reason);
    score += SCORES[reason as keyof typeof SCORES];
  });

  const linkOnly = checkLinkOnly(raw, norm, raw.match(/https?:\/\/[\w\-\._~:\/?#\[\]@!$&'()*+,;=%]+/gi) || []);
  if (linkOnly) {
    reasonsSet.add(linkOnly);
    score += SCORES[linkOnly as keyof typeof SCORES];
  }

  const shortShouty = checkShortAndShouty(raw);
  shortShouty.forEach(reason => {
    reasonsSet.add(reason);
    score += SCORES[reason as keyof typeof SCORES];
  });

  const symbols = checkSymbols(raw);
  if (symbols) {
    reasonsSet.add(symbols);
    score += SCORES[symbols as keyof typeof SCORES];
  }

  // Final decision
  const reasons = Array.from(reasonsSet);
  if (score >= 80) return { action: 'reject', score, reasons };
  if (score >= 20) return { action: 'flag', score, reasons };
  return { action: 'allow', score, reasons };
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
