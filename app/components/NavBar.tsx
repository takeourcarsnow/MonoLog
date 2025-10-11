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
  // Notify layout-aware components that navbar is now visible so they can
  // re-measure (image sizing, card layout). Some clients load the navbar
  // after the post view, so dispatch an event here to trigger updates.
  try { window.dispatchEvent(new Event('monolog:card_layout_change')); } catch(_) {}
  try { window.dispatchEvent(new Event('monolog:navbar_shown')); } catch(_) {}
  // Also dispatch a synthetic resize after a short delay — many third-party
  // listeners rely on the resize event and this helps ensure compatibility.
  try { setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 40); } catch(_) {}
    } else {
      const handler = () => setShow(true);
      const wrapped = () => {
        setShow(true);
        try { window.dispatchEvent(new Event('monolog:card_layout_change')); } catch(_) {}
        try { window.dispatchEvent(new Event('monolog:navbar_shown')); } catch(_) {}
        try { setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 40); } catch(_) {}
      };
      window.addEventListener('preloader-finished', wrapped);
      return () => window.removeEventListener('preloader-finished', wrapped);
    }
  }, []);

  if (!show) return null;

  return (
    <NavbarStatic>
      <NavbarInteractive />
    </NavbarStatic>
  );
}
