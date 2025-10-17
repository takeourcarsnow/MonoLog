'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

import { Button } from "./Button";

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if PWA install is supported
    if ('beforeinstallprompt' in window) {
      setIsSupported(true);
    }

    // Check if deferredPrompt is already available (set by layout script)
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
      // Clear the global deferredPrompt as well
      (window as any).deferredPrompt = null;
    } catch (error) {
      console.error('Install prompt failed:', error);
    }
  };

  // Don't show if already installed or not supported
  if (isInstalled) {
    return (
      <Button
        as="button"
        className="icon btn-no-bg"
        aria-label="App installed"
        disabled={true}
      >
        <span className="icon" aria-hidden>
          {/* download/install icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </Button>
    );
  }

  // If not supported, show a button that opens instructions
  if (!isSupported) {
    return (
      <Button
        as="button"
        onClick={() => {
          // Show instructions for manual installation
          alert('If you\'re having trouble with the regular install prompt, try these manual installation steps:\n\n• Chrome/Edge: Click the menu (⋮) > "Install MonoLog"\n• Android Chrome: Tap the menu (⋮) > "Add to Home screen" > "Install"\n• Firefox: Click the menu (☰) > "Install This Site as an App"\n• Safari: Share button > "Add to Home Screen"\n• Or use your browser\'s install prompt when available');
        }}
        className="icon btn-no-bg"
        aria-label="Installation instructions"
      >
        <span className="icon" aria-hidden>
          {/* download/install icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </Button>
    );
  }

  return (
    <Button
      as="button"
      onClick={handleInstall}
      className="icon btn-no-bg"
      aria-label="Install App"
      disabled={!deferredPrompt}
    >
      <span className="icon" aria-hidden>
        {/* download/install icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </Button>
  );
}