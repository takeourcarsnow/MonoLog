"use client";

import { useEffect, useState } from "react";
import { NavbarStatic } from "./NavbarStatic";
import { NavbarInteractive } from "./NavbarInteractive";

interface NavbarProps {
  activeIndex?: number;
}

export function Navbar({ activeIndex }: NavbarProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ((window as any).__MONOLOG_PRELOADER_HAS_RUN__) {
      setShow(true);
    } else {
      const handler = () => setShow(true);
      window.addEventListener('preloader-finished', handler);
      return () => window.removeEventListener('preloader-finished', handler);
    }
  }, []);

  if (!show) return null;

  return (
    <NavbarStatic>
      <NavbarInteractive />
    </NavbarStatic>
  );
}
