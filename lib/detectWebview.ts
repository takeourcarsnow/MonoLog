// Lightweight heuristic to detect in-app browsers / webviews.
// This is intentionally conservative: it looks for common tokens that
// indicate an embedded webview (Messenger, Instagram, Android WebView 'wv').
export function isInAppBrowser(userAgent?: string) {
  try {
    const ua = (userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '').toLowerCase();
    if (!ua) return false;

    // Android WebView often contains 'wv' or 'androidwebview'
    if (ua.includes(' wv') || ua.includes('; wv') || ua.includes('androidwebview') || ua.includes('version/')) return true;

    // Facebook / Messenger
    if (ua.includes('fbav') || ua.includes('fb_iab') || ua.includes('messenger')) return true;

    // Instagram in-app browser
    if (ua.includes('instagram')) return true;

    // Line, Twitter, and some other in-app browsers advertise themselves
    if (ua.includes('line') || ua.includes('twitter')) return true;

    // Fallback: webview if 'webview' token present
    if (ua.includes('webview')) return true;

    return false;
  } catch (e) {
    return false;
  }
}
