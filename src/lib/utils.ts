export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  const allowedDomains = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'icloud.com',
    'hotmail.com',
    'aol.com',
    'protonmail.com',
    'proton.me',
    'zoho.com',
    'yandex.com',
    'mail.com',
    'gmx.com',
    'live.com',
    'me.com',
    'comcast.net',
    'verizon.net',
    'att.net',
    'gmail.lt',
    'yahoo.lt',
    'outlook.lt',
    'icloud.lt',
    'one.lt',
    'takas.lt',
    'post.lt',
    'centras.lt',
    'mail.lt',
    'inbox.lt',
    'delfi.lt',
    'lrytas.lt'
  ];

  return allowedDomains.includes(domain);
}