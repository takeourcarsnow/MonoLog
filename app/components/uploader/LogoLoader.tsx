import Image from 'next/image';
import React from "react";

type Props = {
  size?: number;
  variant?: 'theme' | 'reverse';
};

export default function LogoLoader({ size = 72, variant = 'theme' }: Props) {
  const className = variant === 'reverse' ? 'logo-subtle-reverse' : 'logo-subtle-theme';
  return (
    // Use high-res PNG so even small rendered sizes look crisp on Retina screens
    <Image src="/icon-1024.png" alt="MonoLog Logo" width={size} height={size} className={className} />
  );
}

