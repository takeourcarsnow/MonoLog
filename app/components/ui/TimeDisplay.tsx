"use client";

import { useState, useEffect } from 'react';
import { formatRelative } from '@/lib/date';

interface TimeDisplayProps {
  date: string | number | Date;
  className?: string;
  // onToggle is accepted for backward-compat but is no longer used.
  onToggle?: (showingFull: boolean) => void;
}

export default function TimeDisplay({ date, className = '' }: TimeDisplayProps) {
  const [currentText, setCurrentText] = useState(() => formatRelative(date));

  useEffect(() => {
    setCurrentText(formatRelative(date));
    // keep updating reactively if `date` changes; no click toggle anymore
  }, [date]);

  // full date string used for the hover tooltip/title
  const fullDate = new Date(date).toLocaleString([], {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });

  return (
    <span
      className={className}
      title={fullDate} /* hover shows full date */
      aria-label={fullDate}
      style={{ display: 'inline-block', lineHeight: 1, verticalAlign: 'middle', transform: 'none' }}
    >
      {currentText}
    </span>
  );
}
