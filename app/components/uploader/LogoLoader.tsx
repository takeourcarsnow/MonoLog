import React from "react";

type Props = {
  size?: number;
};

export default function LogoLoader({ size = 72 }: Props) {
  return (
    <img src="/logo.svg" alt="MonoLog Logo" width={size} height={size} className="logo-subtle" />
  );
}

