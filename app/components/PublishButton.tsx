"use client";

import { useState, useEffect, useRef } from 'react';
import './PublishButton.css';
import { MESSAGES, getWaitIcons, selectTimeIcon } from './publish/publishHelpers';
import { LogoIcon } from './nav/LogoIcon';

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
  const [flash, setFlash] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [waitMsgVisible, setWaitMsgVisible] = useState(false);
  const waitTimerRef = useRef<number | null>(null);

  const messageIndexRef = useRef(0);
  const ICONS = getWaitIcons();
  const [currentWaitMessage, setCurrentWaitMessage] = useState(MESSAGES[0]);
  const [currentWaitIconIndex, setCurrentWaitIconIndex] = useState(0);

  useEffect(() => {
    setPulseAnimation(Boolean(canPost));
  }, [canPost]);

  const handleClick = () => {
    if (!canPost) {
      setFlash(true);
      setTimeout(() => setFlash(false), 900);

      const idx = messageIndexRef.current % MESSAGES.length;
      setCurrentWaitMessage(MESSAGES[idx]);
      setCurrentWaitIconIndex(idx % ICONS.length);
      messageIndexRef.current = (messageIndexRef.current + 1) % MESSAGES.length;

      setWaitMsgVisible(true);
      if (waitTimerRef.current) window.clearTimeout(waitTimerRef.current);
      waitTimerRef.current = window.setTimeout(() => {
        waitTimerRef.current = null;
        setWaitMsgVisible(false);
      }, 3000);
      return;
    }

    onPublish();
  };

  useEffect(() => {
    return () => {
      if (waitTimerRef.current) {
        window.clearTimeout(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    };
  }, []);

  const progressPercent = remainingMs != null && countdownTotalMs != null && countdownTotalMs > 0
    ? Math.max(0, Math.min(100, (remainingMs / countdownTotalMs) * 100))
    : 0;

  const displayTime = remaining && /\d{1,2}:\d{2}:\d{2}/.test(remaining) ? remaining : '00:00:00';
  const timeIcon = selectTimeIcon(remainingMs);

  return (
    <button
      className={`publish-button ${canPost ? 'ready' : 'cooldown'} ${pulseAnimation ? 'pulse' : ''} ${flash ? 'flash' : ''}`}
      onClick={handleClick}
      disabled={disabled || processing}
      aria-label={
        canPost
          ? 'Publish today\u2019s post'
          : remaining
            ? `Next in ${displayTime}`
            : 'On cooldown'
      }
      title={
        canPost
          ? 'Publish today\u2019s post'
          : remaining
            ? `Next in ${displayTime}`
            : 'On cooldown'
      }
    >
      {!canPost && countdownTotalMs != null && remainingMs != null && (
        <span className="cooldown-bar" aria-hidden>
          <span
            className="fill"
            style={{ width: `${progressPercent}%` }}
          />
        </span>
      )}
      <span className="publish-content">
        {canPost ? (
          <span className="publish-text ready-text">
            <LogoIcon size={20} strokeWidth={2} />
            Publish
          </span>
        ) : (
          <span className="countdown-display" aria-live="polite">
            <span className={`wait-message ${waitMsgVisible ? 'visible' : ''}`} aria-hidden={!waitMsgVisible}>
              <span className="wait-icon" aria-hidden style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}>
                {ICONS[currentWaitIconIndex]}
              </span>
              {currentWaitMessage}
            </span>
            <span className={`countdown-time ${!waitMsgVisible ? 'visible' : ''}`} aria-hidden={waitMsgVisible}>
              <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }} aria-hidden>{timeIcon}</span>
              {displayTime}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}
