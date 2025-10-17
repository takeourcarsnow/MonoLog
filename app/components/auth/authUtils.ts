// authUtils.ts
export function normalizeUsername(v: string) {
  return v.trim().toLowerCase();
}

export function validUsername(v: string) {
  const s = normalizeUsername(v);
  return /^[a-z0-9_-]{3,32}$/.test(s);
}

export function isTempEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  // Common temporary/disposable email domains
  const tempDomains = [
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'temp-mail.org', 'throwaway.email',
    'yopmail.com', 'maildrop.cc', 'tempail.com', 'dispostable.com', 'getnada.com',
    'mail-temporaire.fr', 'mytemp.email', 'temp-mail.io', 'tempmail.net', 'fakeinbox.com',
    'mailcatch.com', 'tempinbox.com', 'temp-mail.ru', '10minutemail.net', 'guerrillamail.net',
    'mailinator.net', 'temp-mail.org', 'throwaway.email', 'yopmail.fr', 'maildrop.cc',
    'tempail.com', 'dispostable.com', 'getnada.com', 'mail-temporaire.fr', 'mytemp.email',
    'temp-mail.io', 'tempmail.net', 'fakeinbox.com', 'mailcatch.com', 'tempinbox.com',
    'temp-mail.ru', '10minutemail.de', 'guerrillamail.de', 'mailinator.de', 'temp-mail.de',
    'throwaway.email', 'yopmail.de', 'maildrop.cc', 'tempail.de', 'dispostable.de',
    'getnada.de', 'mail-temporaire.de', 'mytemp.email', 'temp-mail.io', 'tempmail.de',
    'fakeinbox.de', 'mailcatch.de', 'tempinbox.de', 'temp-mail.ru', '10minutemail.co.uk',
    'guerrillamail.co.uk', 'mailinator.co.uk', 'temp-mail.co.uk', 'throwaway.email',
    'yopmail.co.uk', 'maildrop.cc', 'tempail.co.uk', 'dispostable.co.uk', 'getnada.co.uk',
    'mail-temporaire.co.uk', 'mytemp.email', 'temp-mail.io', 'tempmail.co.uk', 'fakeinbox.co.uk',
    'mailcatch.co.uk', 'tempinbox.co.uk', 'temp-mail.ru', '10minutemail.com.au', 'guerrillamail.com.au',
    'mailinator.com.au', 'temp-mail.com.au', 'throwaway.email', 'yopmail.com.au', 'maildrop.cc',
    'tempail.com.au', 'dispostable.com.au', 'getnada.com.au', 'mail-temporaire.com.au', 'mytemp.email',
    'temp-mail.io', 'tempmail.com.au', 'fakeinbox.com.au', 'mailcatch.com.au', 'tempinbox.com.au',
    'temp-mail.ru', '10minutemail.ca', 'guerrillamail.ca', 'mailinator.ca', 'temp-mail.ca',
    'throwaway.email', 'yopmail.ca', 'maildrop.cc', 'tempail.ca', 'dispostable.ca',
    'getnada.ca', 'mail-temporaire.ca', 'mytemp.email', 'temp-mail.io', 'tempmail.ca',
    'fakeinbox.ca', 'mailcatch.ca', 'tempinbox.ca', 'temp-mail.ru'
  ];
  
  return tempDomains.includes(domain);
}