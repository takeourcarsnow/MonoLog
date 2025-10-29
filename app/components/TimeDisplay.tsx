import { useState } from 'react';
import { formatRelative } from '@/src/lib/date';

interface TimeDisplayProps {
  date: string | number | Date;
  className?: string;
}

export default function TimeDisplay({ date, className = '' }: TimeDisplayProps) {
  const [showFullDate, setShowFullDate] = useState(false);

  return (
    <span
      className={`${className} cursor-pointer`}
      onClick={() => setShowFullDate(!showFullDate)}
      title={showFullDate ? 'Click to show relative time' : 'Click to show full date'}
    >
      {showFullDate ? new Date(date).toLocaleString([], { 
        year: 'numeric', 
        month: 'numeric', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit' 
      }) : `${formatRelative(date)} ago`}
    </span>
  );
}