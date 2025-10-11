"use client";

interface LogoIconProps {
  size?: number;
  strokeWidth?: number;
}

export function LogoIcon({ size = 20, strokeWidth = 2 }: LogoIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <circle
        cx="12"
        cy="12"
        r="5.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}