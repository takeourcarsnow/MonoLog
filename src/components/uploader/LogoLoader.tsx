import React from "react";

type Props = {
  size?: number;
};

export default function LogoLoader({ size = 72 }: Props) {
  const s = Math.max(32, size);
  const view = 96;

  return (
    <div className="logo-loader" aria-hidden>
      <svg width={s} height={s} viewBox={`0 0 ${view} ${view}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden focusable="false">
        {/* slow rotating outer box for depth */}
        <g className="logo-rotate-slow" style={{ transformOrigin: '48px 48px' }}>
          <rect className="logo-box" x="6" y="6" rx="18" width="84" height="84" fill="none" stroke="currentColor" strokeWidth="4" strokeOpacity="0.12" />
        </g>

        {/* faster rotating ring */}
        <g className="logo-rotate-fast" style={{ transformOrigin: '48px 48px' }}>
          <circle cx="48" cy="48" r="34" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.08" />
          <path className="logo-ring-arc" d="M82 48a34 34 0 0 1-68 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="88" strokeDashoffset="16" />
          <path className="logo-ring-arc faint" d="M82 48a34 34 0 0 1-34 -34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.06" />
        </g>

        {/* small rotating sparks around the ring */}
        <g className="logo-sparks" aria-hidden>
          <circle className="spark" cx="48" cy="12" r="2.6" fill="currentColor" />
          <circle className="spark" cx="84" cy="48" r="2.6" fill="currentColor" />
          <circle className="spark" cx="48" cy="84" r="2.6" fill="currentColor" />
          <circle className="spark" cx="12" cy="48" r="2.6" fill="currentColor" />
        </g>

        {/* center dot that pulses */}
        <circle className="logo-dot" cx="48" cy="48" r="18" fill="currentColor" />
      </svg>
    </div>
  );
}

