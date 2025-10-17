import { useState } from 'react';
import { formatRelative } from '@/src/lib/date';

interface TimeDisplayProps {
  date: string | number | Date;
  className?: string;
}

export default function TimeDisplay({ date, className = '' }: TimeDisplayProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <span
      className={`${className} relative`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {formatRelative(date)}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
          {new Date(date).toLocaleString([], { 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit' 
          })}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </span>
  );
}