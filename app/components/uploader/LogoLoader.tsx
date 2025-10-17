import Image from 'next/image';
import React from "react";

type Props = {
  size?: number;
  // support legacy 'theme'|'reverse' and new 'first'|'other' variants
  variant?: 'theme' | 'reverse' | 'first' | 'other';
};

export default function LogoLoader({ size = 72, variant = 'theme' }: Props) {
  // Map variants to explicit CSS classes. Keep backward compatibility with
  // the previous 'theme' and 'reverse' names by treating them as 'other'.
  let className = 'logo-subtle-theme';
  if (variant === 'reverse') className = 'logo-subtle-reverse';
  if (variant === 'first') className = 'logo-first';
  if (variant === 'other') className = 'logo-other';

  return (
    // Use SVG logo for better scalability and transparency
    <Image src="/logo.svg" alt="MonoLog Logo" width={size} height={size} className={className} />
  );
}

