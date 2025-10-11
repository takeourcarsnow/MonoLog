// Improved automod: score-based, normalizes leet/diacritics, and returns
// structured reasons. Designed to be synchronous and small.

export type ModerationResult = {
  action: 'allow' | 'reject' | 'flag';
  score: number; // higher score = more likely to be problematic
  reasons: string[]; // list of heuristics triggered
};

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

export function checkComment(text: string): ModerationResult {
  const reasons: string[] = [];
  let score = 0;

  if (!text || !text.trim()) {
    return { action: 'reject', score: 100, reasons: ['empty'] };
  }

  const raw = text;
  const norm = normalizeText(raw);

  // Detect banned words using normalized text
  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i');
    if (re.test(norm)) {
      reasons.push('banned_word');
      score += 80;
    }
  }

  // URL heuristics
  const urlRe = /https?:\/\/[\w\-\._~:\/?#\[\]@!$&'()*+,;=%]+/gi;
  const urls = (raw.match(urlRe) || []);
  if (urls.length >= 2) {
    reasons.push('multiple_links'); score += 40;
  }
  if (urls.some(u => u.length > 100)) { reasons.push('long_url'); score += 25; }

  // token repetition and spammy signals
  if (/([a-z])\1{6,}/i.test(norm)) { reasons.push('repeated_chars'); score += 40; }
  const tokens = norm.split(/\s+/).filter(Boolean);
  const counts: Record<string, number> = {};
  for (const t of tokens) {
    counts[t] = (counts[t] || 0) + 1;
    if (counts[t] >= 6) { reasons.push('repetition'); score += 45; }
  }

  // link-only or mostly-link content
  const nonPunct = norm.replace(/[\p{P}\p{S}]/gu, '').replace(/\s+/g, '').trim();
  if (nonPunct.length < 6 && urls.length === 1) { reasons.push('link_only'); score += 20; }

  // short messages with excessive punctuation or uppercase (shouting)
  if (raw.length < 6 && /[!]{2,}/.test(raw)) { reasons.push('short_exclaim'); score += 10; }
  if (raw.length < 10 && raw === raw.toUpperCase() && /[A-Z]/.test(raw)) { reasons.push('shouting'); score += 8; }

  // cheap heuristic: many characters that aren't letters/numbers -> likely spammy
  const nonAlnum = (raw.match(/[^\p{L}\p{N}\s]/gu) || []).length;
  if (nonAlnum > Math.min(30, Math.max(5, Math.floor(raw.length / 6)))) { reasons.push('lots_symbols'); score += 12; }

  // final decision thresholds
  if (score >= 80) return { action: 'reject', score, reasons };
  if (score >= 20) return { action: 'flag', score, reasons };
  return { action: 'allow', score, reasons };
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
