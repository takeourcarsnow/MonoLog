'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // Already installed, don't show prompt
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      return;
    }

    const handler = (e: Event) => {
      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom install prompt after a short delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
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

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md
                 bg-white dark:bg-gray-900 border-2 border-blue-500 dark:border-blue-400
                 rounded-xl shadow-2xl p-5 z-[9999] animate-slide-down"
      role="dialog"
      aria-labelledby="install-title"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 
                   dark:hover:text-gray-300 rounded-full hover:bg-gray-100 
                   dark:hover:bg-gray-800 transition-colors"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>

      <div className="pr-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 bg-white dark:bg-black rounded-full"></div>
          </div>
          <h3 id="install-title" className="text-lg font-bold text-gray-900 dark:text-white">
            Install MonoLog
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
          Get the app experience! Add to your home screen for faster access and a native feel.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white
                     px-5 py-3 rounded-lg font-semibold text-base
                     shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]
                     active:scale-[0.98]"
          >
            Install Now
          </button>
          <button
            onClick={handleDismiss}
            className="px-5 py-3 rounded-lg font-medium text-base
                     text-gray-700 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                     border border-gray-300 dark:border-gray-600"
          >
            Later
          </button>
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
