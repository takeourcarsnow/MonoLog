"use client";

import { useState, useEffect } from 'react';
import './PublishButton.css';

interface PublishButtonProps {
  canPost: boolean;
  remaining: string;
  remainingMs: number | null;
  countdownTotalMs: number | null;
  processing: boolean;
  disabled?: boolean;
  onPublish: () => void;
}

export function PublishButton({
  canPost,
  remaining,
  remainingMs,
  countdownTotalMs,
  processing,
  disabled = false,
  onPublish
}: PublishButtonProps) {
  const [flash, setFlash] = useState(false); // visual feedback when clicking during cooldown
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Enable pulse animation when ready to post
  useEffect(() => {
    if (canPost && !processing) {
      setPulseAnimation(true);
    } else {
      setPulseAnimation(false);
    }
  }, [canPost, processing]);

  const handleClick = () => {
    if (!canPost) {
      // trigger a brief flash animation on the bar & digits
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
      return;
    }
    onPublish();
  };

  // Calculate progress percentage (0 = done, 100 = just posted)
  const progressPercent = remainingMs != null && countdownTotalMs != null && countdownTotalMs > 0
    ? Math.max(0, Math.min(100, (remainingMs / countdownTotalMs) * 100))
    : 0;

  // Display string: plain HH:MM:SS (remove h m s labels)
  const displayTime = remaining && /\d{1,2}:\d{2}:\d{2}/.test(remaining) ? remaining : '00:00:00';

  return (
    <button
      className={`publish-button ${canPost ? 'ready' : 'cooldown'} ${pulseAnimation ? 'pulse' : ''} ${flash ? 'flash' : ''}`}
      onClick={handleClick}
      disabled={disabled || processing}
      aria-label={
        canPost
          ? 'Publish your daily post'
          : remaining
            ? `Next publish available in ${remaining.replace(/:/g, ' hours ').replace(/ (\\d\\d)$/,' minutes and $1 seconds')}`
            : 'On cooldown'
      }
    >
      {/* Mini fading bar showing remaining time (shrinks toward 0) */}
      {!canPost && countdownTotalMs != null && remainingMs != null && (
        <span className="cooldown-bar" aria-hidden>
          <span
            className="fill"
            style={{ width: `${progressPercent}%` }}
          />
        </span>
      )}
      <span className="publish-content">
        {processing ? (
          <span className="publish-text">
            <span className="spinner" aria-hidden="true" />
            Processing…
          </span>
        ) : canPost ? (
          <span className="publish-text ready-text">
            <svg className="icon-publish" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 2L12 14M12 2L7 7M12 2L17 7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 14L3 20C3 21.1046 3.89543 22 5 22L19 22C20.1046 22 21 21.1046 21 20L21 14" strokeLinecap="round"/>
            </svg>
            Publish
          </span>
        ) : (
          <span className="countdown-display">
            <span className="countdown-time">{displayTime}</span>
          </span>
        )}
      </span>
    </button>
  );
}
