'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const handlerRef = useRef<((e: Event) => void) | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // Already installed, don't show prompt
    }

    // Respect prior choices:
    // - permanent dismissal (no longer show)
    // - snooze until a future timestamp (remind later)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;
    const snooze = localStorage.getItem('pwa-install-snooze');
    if (snooze) {
      const until = Number(snooze) || 0;
      if (Date.now() < until) return; // still snoozed
      // expired snooze -> remove and allow showing again
      localStorage.removeItem('pwa-install-snooze');
    }

    // Prefer showing only to mobile users (Chrome on Android is the primary target).
    // This prevents a desktop infobar from feeling intrusive.
    const isMobileLike = /Android|Mobile|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobileLike) return;

    // Keep a reference to the handler so other callbacks can remove it
    const handler = (e: Event) => {
      // Respect prior choices at the moment the event fires as well.
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) return;
      const snooze = localStorage.getItem('pwa-install-snooze');
      if (snooze) {
        const until = Number(snooze) || 0;
        if (Date.now() < until) return; // still snoozed
        // expired snooze -> remove and continue
        localStorage.removeItem('pwa-install-snooze');
      }

      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom install prompt after a short delay so it doesn't
      // interrupt the user's immediate task.
      setTimeout(() => setShowPrompt(true), 3000);
    };

    // Store the handler on a ref so other handlers can remove the listener
    handlerRef.current = handler;
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      handlerRef.current = null;
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

  // install prompt response logging removed per user request

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  // Snooze the prompt for a number of days (default 3 days)
  const handleSnooze = (days = 3) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem('pwa-install-snooze', String(until));
    setShowPrompt(false);
    setDeferredPrompt(null);
    // If the browser fires the event again we don't want to show it until
    // the snooze expires — remove the listener for now.
    try {
      if (handlerRef.current) window.removeEventListener('beforeinstallprompt', handlerRef.current);
    } catch (err) {
      /* ignore */
    }
  };

  // Permanently dismiss the install prompt
  const handlePermanentDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowPrompt(false);
    setDeferredPrompt(null);
    // Stop listening for future install prompts so the choice is respected
    try {
      if (handlerRef.current) window.removeEventListener('beforeinstallprompt', handlerRef.current);
    } catch (err) {
      /* ignore */
    }
  };

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md
                 bg-white dark:bg-gray-900 border border-transparent dark:border-transparent
                 rounded-xl shadow-lg p-4 z-[9999] animate-slide-down"
      role="dialog"
      aria-labelledby="install-title"
      aria-describedby="install-desc"
    >
      <button
        onClick={handlePermanentDismiss}
        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 
                   dark:hover:text-gray-300 rounded-full hover:bg-gray-100 
                   dark:hover:bg-gray-800 transition-colors"
        aria-label="Don't show again"
        title="Don't show this again"
      >
        <X size={18} />
      </button>

      <div className="pr-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 bg-white dark:bg-black rounded-full"></div>
          </div>
          <h3 id="install-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Add MonoLog to your phone
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed" id="install-desc">
          Quick access from your home screen, offline support, and a cleaner app-like experience.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Tap &#34;Add&#34; to install. If you prefer, we can remind you later.</p>
        <div className="flex gap-3">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white
                     px-5 py-3 rounded-lg font-semibold text-base
                     shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]
                     active:scale-[0.98]"
          >
            Add to Home Screen
          </button>
          <button
            onClick={() => handleSnooze(3)}
            className="px-4 py-2 rounded-lg font-medium text-sm
                     text-gray-700 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                     border border-gray-200 dark:border-gray-700"
          >
            Remind me in 3 days
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>Not sure? You can always install later from the browser menu.</span>
          <button onClick={handlePermanentDismiss} className="underline hover:text-gray-700 ml-2">Don&#39;t show again</button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translate(-50%, -120%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
