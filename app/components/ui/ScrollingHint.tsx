"use client";

import React, { useEffect, useState } from "react";

interface Props {
  messages: string[];
  interval?: number; // ms between message switches
  fadeMs?: number; // fade duration in ms
  className?: string;
}

// Text rotator: cycles through short messages by fading out/in.
export default function ScrollingHint({ messages, interval = 4000, fadeMs = 600, className = '' }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!messages || messages.length <= 1) return;

    const tick = () => {
      setVisible(false);
      // after fade out, switch message and fade in
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, fadeMs);
    };

    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [messages, interval, fadeMs]);

  return (
    <span className={className} aria-live="polite">
      <span style={{ transition: `opacity ${fadeMs}ms ease`, opacity: visible ? 1 : 0, display: 'inline-block' }}>
        {messages && messages.length ? messages[index] : ''}
      </span>
    </span>
  );
}
