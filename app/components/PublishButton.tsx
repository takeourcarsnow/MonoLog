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
  // double-buffer two message slots so we can crossfade between warnings
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const slotMessage = useRef<string[]>([MESSAGES[0], '']);
  const slotIconIndex = useRef<number[]>([0, 0]);

  useEffect(() => {
    setPulseAnimation(Boolean(canPost));
  }, [canPost]);

  const handleClick = () => {
    if (!canPost) {
      setFlash(true);
      setTimeout(() => setFlash(false), 900);

      const idx = messageIndexRef.current % MESSAGES.length;
      // write into the inactive slot and flip activeSlot to trigger CSS crossfade
      const nextSlot = activeSlot === 0 ? 1 : 0;
      slotMessage.current[nextSlot] = MESSAGES[idx];
      slotIconIndex.current[nextSlot] = idx % ICONS.length;
      setCurrentWaitMessage(MESSAGES[idx]);
      setCurrentWaitIconIndex(idx % ICONS.length);
      setActiveSlot(nextSlot);
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
          <span className={`countdown-display ${waitMsgVisible ? 'state-wait' : 'state-countdown'}`} aria-live="polite">
            <span className={`wait-messages`} aria-hidden={!waitMsgVisible}>
              <span className={`wait-message slot-0 ${(waitMsgVisible && activeSlot === 0) ? 'visible' : ''}`}>
                <span className="wait-icon" aria-hidden style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}>
                  {ICONS[slotIconIndex.current[0]]}
                </span>
                {slotMessage.current[0]}
              </span>
              <span className={`wait-message slot-1 ${(waitMsgVisible && activeSlot === 1) ? 'visible' : ''}`}>
                <span className="wait-icon" aria-hidden style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}>
                  {ICONS[slotIconIndex.current[1]]}
                </span>
                {slotMessage.current[1]}
              </span>
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
