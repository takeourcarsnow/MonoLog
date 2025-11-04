"use client";

import { useState, useEffect } from 'react';
import { formatRelative } from '@/lib/date';

interface TimeDisplayProps {
  date: string | number | Date;
  className?: string;
}

export default function TimeDisplay({ date, className = '' }: TimeDisplayProps) {
  const [showFullDate, setShowFullDate] = useState(false);
  const [currentText, setCurrentText] = useState(formatRelative(date));
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    setOpacity(0);
    const timer = setTimeout(() => {
      setCurrentText(showFullDate ? new Date(date).toLocaleString([], { 
        year: 'numeric', 
        month: 'numeric', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit' 
      }) : formatRelative(date));
      setOpacity(1);
    }, 150);
    return () => clearTimeout(timer);
  }, [showFullDate, date]);

  return (
    <span
      className={`${className} cursor-pointer`}
      onClick={() => setShowFullDate(!showFullDate)}
      title={showFullDate ? 'Click to show relative time' : 'Click to show full date'}
      style={{ opacity, transition: 'opacity 0.3s ease-in-out' }}
    >
      {currentText}
    </span>
  );
}
