import { useEffect } from "react";

export function useBodyClass(viewStorageKey: string) {
  useEffect(() => {
    // Add a scoped body class for hashtag pages so we can apply a CSS
    // fallback (for browsers that don't support :has()). Using a specific
    // class avoids any unintended layout changes on other pages.
    try {
      if (typeof window !== 'undefined' && viewStorageKey === 'hashtagView') {
        document.body.classList.add('hashtag-page-scroll');
        return () => { document.body.classList.remove('hashtag-page-scroll'); };
      }
    } catch (_) { }
    return () => {};
  }, [viewStorageKey]);
}