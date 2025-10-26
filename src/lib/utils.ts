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

  // Allowed email domains: major providers and Lithuanian providers
  const allowedDomains = [
    // Major global providers
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'aol.com',
    'protonmail.com',
    'icloud.com',
    'me.com',
    'zoho.com',
    'yandex.com',
    'mail.ru',
    'gmx.com',
    'web.de',
    't-online.de',
    'comcast.net',
    'verizon.net',
    'att.net',
    'sbcglobal.net',
    'bellsouth.net',
    'cox.net',
    'earthlink.net',
    'charter.net',
    // Lithuanian providers
    'one.lt',
    'takas.lt',
    'post.lt',
    'gmail.lt', // Though Gmail is gmail.com, sometimes used
    'yahoo.lt',
    'hotmail.lt',
    'outlook.lt',
    'centras.lt',
    'rokas.lt',
    'vmi.lt',
    'delfi.lt',
    'alfa.lt',
    'esveikata.lt',
    'lietuvos.pastas.lt',
    'mail.lt'
  ];

  return allowedDomains.includes(domain);
}