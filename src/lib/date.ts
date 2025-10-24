export function toDateKey(d: Date | string = new Date()): string {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// UTC version for server-side date calculations
export function toUTCDateKey(d: Date | string = new Date()): string {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthMatrix(year: number, monthIdx: number) {
  const first = new Date(year, monthIdx, 1);
  const last = new Date(year, monthIdx + 1, 0);
  const days = last.getDate();
  const startWeekday = (first.getDay() + 6) % 7; // Mon=0
  const grid: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) grid.push(null);
  for (let d = 1; d <= days; d++) grid.push(new Date(year, monthIdx, d));
  return grid;
}

export function formatRelative(date: string | number | Date) {
  const now = Date.now();
  const diff = (now - new Date(date).getTime()) / 1000;
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  
  // For older posts, show weeks and remaining days
  const weeks = Math.floor(diff / (86400 * 7));
  const remainingDays = Math.floor((diff % (86400 * 7)) / 86400);
  
  if (weeks === 1 && remainingDays === 0) return "1w";
  if (weeks === 1) return `1w ${remainingDays}d`;
  if (remainingDays === 0) return `${weeks}w`;
  return `${weeks}w ${remainingDays}d`;
}
