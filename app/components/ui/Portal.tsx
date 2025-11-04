"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = { children: ReactNode; wrapperId?: string; className?: string };

export default function Portal({ children, wrapperId = 'modal-root', className }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let root = document.getElementById(wrapperId);
    if (!root) {
      root = document.createElement('div');
      root.id = wrapperId;
      if (className) root.className = className;
      document.body.appendChild(root);
    } else if (className && root.className !== className) {
      root.className = className;
    }
    return () => {
      const root = document.getElementById(wrapperId);
      if (root && !root.hasChildNodes()) {
        root.remove();
      }
    };
  }, [wrapperId, className]);

  if (!mounted) return null;
  const root = document.getElementById(wrapperId)!;
  return createPortal(children, root);
}
