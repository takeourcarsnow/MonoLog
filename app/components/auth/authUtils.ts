// authUtils.ts
export function normalizeUsername(v: string) {
  return v.trim().toLowerCase();
}

export function validUsername(v: string) {
  const s = normalizeUsername(v);
  return /^[a-z0-9_-]{3,32}$/.test(s);
}