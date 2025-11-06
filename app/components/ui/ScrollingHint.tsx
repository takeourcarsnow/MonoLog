"use client";

import React, { useEffect, useState } from "react";

interface Props {
  messages: string[];
  interval?: number; // ms between message switches (should be >5500 for typewriter)
  className?: string;
}

// Typewriter hint: cycles through short messages by typing them out, holding, then backspacing.
export default function ScrollingHint({ messages, interval = 5500, className = '' }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!messages || messages.length <= 1) return;

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, interval);
    return () => clearInterval(id);
  }, [messages, interval]);

  return (
    <span className={className} aria-live="polite" style={{ textAlign: 'left' }}>
      <span
        key={index}
        className="typewriter"
      >
        {messages && messages.length ? messages[index] : ''}
      </span>
    </span>
  );
}
