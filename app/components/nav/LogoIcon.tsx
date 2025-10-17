"use client";

interface LogoIconProps {
  size?: number;
  strokeWidth?: number;
}

export function LogoIcon({ size = 20, strokeWidth = 2 }: LogoIconProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        maskImage: "url('/logo.svg')",
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        backgroundColor: 'currentColor',
      }}
    />
  );
}