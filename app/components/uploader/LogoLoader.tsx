import React from "react";

type Props = {
  size?: number;
  variant?: 'theme' | 'reverse';
};

export default function LogoLoader({ size = 72, variant = 'theme' }: Props) {
  const className = variant === 'reverse' ? 'logo-subtle-reverse' : 'logo-subtle-theme';
  return (
    <img src="/newlogo.svg" alt="MonoLog Logo" width={size} height={size} className={className} />
  );
}

