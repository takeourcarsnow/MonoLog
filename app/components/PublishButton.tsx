"use client";

import { useState, useEffect, useRef } from 'react';
import { Hourglass, Clock, RefreshCw, Zap, Sparkles, Star, Camera, Check, MessageCircle, Compass, Calendar, Lock, Home } from 'lucide-react';
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
  disabled = false,
  onPublish
}: PublishButtonProps) {
  const [flash, setFlash] = useState(false); // visual feedback when clicking during cooldown
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [waitMsgVisible, setWaitMsgVisible] = useState(false);
  const waitTimerRef = useRef<number | null>(null);
  // Short messages to cycle through when the user clicks while on cooldown
  const MESSAGES = [
    'Almost there',
    'Give it a moment',
    'Hold on — nearly ready',
    'One moment please',
    'Not yet — thanks for waiting',
    'Hang tight',
    'A sec...',
    'Try exploring meanwhile',
    'Soon — almost done',
    'Patience pays off',
    'Just a little longer',
    'Almost ready',
    'Thanks for waiting',
    'Back shortly',
    'Nearly there — hold on',
    'Give it a beat',
    'Sit tight',
    'Coming up soon',
    'We’ll be ready shortly',
    'Hold tight — good things take time',
  ];
  const messageIndexRef = useRef(0);
  // Use lucide-react icons to match existing project's icon style
  const ICONS: JSX.Element[] = [
    <Hourglass key="hg" size={18} strokeWidth={1.6} aria-hidden />,
    <Clock key="clk" size={18} strokeWidth={1.6} aria-hidden />,
    <RefreshCw key="ref" size={18} strokeWidth={1.6} aria-hidden />,
    <Zap key="zap" size={18} strokeWidth={1.6} aria-hidden />,
    <Sparkles key="spr" size={18} strokeWidth={1.6} aria-hidden />,
    <Star key="star" size={18} strokeWidth={1.6} aria-hidden />,
    <Camera key="cam" size={18} strokeWidth={1.6} aria-hidden />,
    <Check key="check" size={18} strokeWidth={1.6} aria-hidden />,
    <MessageCircle key="msg" size={18} strokeWidth={1.6} aria-hidden />,
    <Compass key="cmp" size={18} strokeWidth={1.6} aria-hidden />,
    <Calendar key="cal" size={18} strokeWidth={1.6} aria-hidden />,
    <Lock key="lock" size={18} strokeWidth={1.6} aria-hidden />,
    <Home key="home" size={18} strokeWidth={1.6} aria-hidden />,
  ];
  const [currentWaitMessage, setCurrentWaitMessage] = useState(MESSAGES[0]);
  const [currentWaitIconIndex, setCurrentWaitIconIndex] = useState(0);

  // Enable pulse animation when ready to post
  useEffect(() => {
    // Pulse only depends on readiness to post, not unrelated upload processing
    setPulseAnimation(Boolean(canPost));
  }, [canPost]);

  const handleClick = () => {
    if (!canPost) {
      // trigger a brief flash animation on the bar & digits
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
      // show an inline wait message inside the button (not a toast)
      // rotate to the next message on every press
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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (waitTimerRef.current) {
        window.clearTimeout(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    };
  }, []);

  // Calculate progress percentage (0 = done, 100 = just posted)
  const progressPercent = remainingMs != null && countdownTotalMs != null && countdownTotalMs > 0
    ? Math.max(0, Math.min(100, (remainingMs / countdownTotalMs) * 100))
    : 0;

  // Display string: plain HH:MM:SS (remove h m s labels)
  const displayTime = remaining && /\d{1,2}:\d{2}:\d{2}/.test(remaining) ? remaining : '00:00:00';

  // Choose an inline SVG icon to show alongside the countdown time depending on how much remains
  const timeIcon = (() => {
    if (remainingMs == null) return ICONS[0];
    if (remainingMs <= 60_000) return ICONS[1]; // < 1 minute -> small clock
    if (remainingMs <= 5 * 60_000) return ICONS[2]; // < 5 minutes -> stopwatch
    if (remainingMs <= 30 * 60_000) return ICONS[1]; // < 30 minutes -> clock
    return ICONS[3]; // longer -> lightning / readiness
  })();

  return (
    <button
      className={`publish-button ${canPost ? 'ready' : 'cooldown'} ${pulseAnimation ? 'pulse' : ''} ${flash ? 'flash' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={
        canPost
          ? 'Publish today\u2019s post'
          : remaining
            ? `Next in ${displayTime}`
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
        {canPost ? (
          <span className="publish-text ready-text">
            <svg className="icon-publish" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 2L12 14M12 2L7 7M12 2L17 7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 14L3 20C3 21.1046 3.89543 22 5 22L19 22C20.1046 22 21 21.1046 21 20L21 14" strokeLinecap="round"/>
            </svg>
            Publish
          </span>
        ) : (
          <span className="countdown-display">
            {/* both elements are present so we can cross-fade/slide between them */}
            <span className={`wait-message ${waitMsgVisible ? 'visible' : ''}`}>
              <span className="wait-icon" aria-hidden style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}>
                {ICONS[currentWaitIconIndex]}
              </span>
              {currentWaitMessage}
            </span>
            <span className={`countdown-time ${!waitMsgVisible ? 'visible' : ''}`}>
              <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }} aria-hidden>{timeIcon}</span>
              {displayTime}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}
