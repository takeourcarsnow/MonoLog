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

  useEffect(() => {
    // Helper checks
    const isAlreadyInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (isAlreadyInstalled) return; // Already installed, don't show prompt

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    const snooze = localStorage.getItem('pwa-install-snooze');
    if (snooze) {
      const until = Number(snooze) || 0;
      if (Date.now() < until) return; // still snoozed
      // expired snooze -> remove and allow showing again
      localStorage.removeItem('pwa-install-snooze');
    }

    // Only show to mobile-like user agents (primary target: Android Chrome)
    const isMobileLike = /Android|Mobile|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobileLike) return;

    // If the global deferredPrompt is already set (e.g. captured by inline
    // script in <head>), use it. Otherwise attach a listener so we capture
    // the event even if it fires after hydration.
    const tryShowFromEvent = (e: Event) => {
      try {
        const be = e as BeforeInstallPromptEvent;
        // Prevent the browser from showing the default prompt; we'll show a
        // custom UI instead.
        if (typeof be.preventDefault === 'function') be.preventDefault();
        (window as any).deferredPrompt = be;
        setDeferredPrompt(be);
        // Small delay so the UI doesn't interrupt the immediate task
        setTimeout(() => setShowPrompt(true), 3000);
      } catch (err) {
        // ignore
      }
    };

    // If something already set the global deferred prompt, use it immediately
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
      setTimeout(() => setShowPrompt(true), 3000);
    }

    window.addEventListener('beforeinstallprompt', tryShowFromEvent as EventListener);

    // Also listen for appinstalled to clear any stored prompt/state
    const onAppInstalled = () => {
      try {
        localStorage.setItem('pwa-install-dismissed', 'true');
        setShowPrompt(false);
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('appinstalled', onAppInstalled as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', tryShowFromEvent as EventListener);
      window.removeEventListener('appinstalled', onAppInstalled as EventListener);
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
    (window as any).deferredPrompt = null;
    setShowPrompt(false);
  };

  // Snooze the prompt for a number of days (default 3 days)
  const handleSnooze = (days = 3) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem('pwa-install-snooze', String(until));
    setShowPrompt(false);
    setDeferredPrompt(null);
    (window as any).deferredPrompt = null;
  };

  // Permanently dismiss the install prompt
  const handlePermanentDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowPrompt(false);
    setDeferredPrompt(null);
    (window as any).deferredPrompt = null;
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
