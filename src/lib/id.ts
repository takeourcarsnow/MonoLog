export function uid() {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}