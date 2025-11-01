"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isNavItemActive } from "./nav/navHelpers";
import { StaticContainer } from "./StaticContainer";

interface NavbarProps {
  activeIndex?: number;
}

export function Navbar({ activeIndex }: NavbarProps) {
  const [show, setShow] = useState(false);
  const pathname = usePathname() || "/";
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [activeIndexState, setActiveIndexState] = useState<number>(-1);

  useEffect(() => {
    if ((window as any).__MONOLOG_PRELOADER_HAS_RUN__) {
      setShow(true);
      // Notify layout-aware components that navbar is now visible
      try { window.dispatchEvent(new Event('monolog:card_layout_change')); } catch(_) {}
      try { window.dispatchEvent(new Event('monolog:navbar_shown')); } catch(_) {}
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

  useEffect(() => {
    const currentPath = pathname || '/';
    const index = navItems.findIndex(item => isNavItemActive(currentPath, item.path));
    setActiveIndexState(index);
  }, [pathname]);

  useEffect(() => {
    // Positioning logic extracted so it can be called on resize/orientation change
    function positionIndicator() {
      const container = indicatorRef.current?.parentElement;
      if (!container || activeIndexState < 0) {
        if (indicatorRef.current) indicatorRef.current.style.opacity = '0';
        return;
      }

      const activeItem = container.querySelector(`.tab-item-static[data-index="${activeIndexState}"]`) as HTMLElement;
      if (!activeItem || !indicatorRef.current) return;

      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const left = itemRect.left - containerRect.left + (container as HTMLElement).scrollLeft;
      const itemCenter = left + itemRect.width / 2;
      const width = 28;
      const indicatorLeft = Math.round(itemCenter - width / 2);

      const color = activeItem.style.getPropertyValue('--tab-color') || '#000';

      indicatorRef.current.style.transform = `translate3d(${indicatorLeft}px,0,0)`;
      indicatorRef.current.style.width = `${width}px`;
      indicatorRef.current.style.backgroundColor = color;
      indicatorRef.current.style.opacity = '1';
    }

    // Reposition immediately and also when viewport/layout changes
    positionIndicator();

    if (typeof window !== 'undefined') {
      // Recompute position on resize / orientationchange and when navbar shown or card layout changes
      window.addEventListener('resize', positionIndicator);
      window.addEventListener('orientationchange', positionIndicator);
      window.addEventListener('monolog:card_layout_change', positionIndicator as any);
      window.addEventListener('monolog:navbar_shown', positionIndicator as any);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', positionIndicator);
        window.removeEventListener('orientationchange', positionIndicator);
        window.removeEventListener('monolog:card_layout_change', positionIndicator as any);
        window.removeEventListener('monolog:navbar_shown', positionIndicator as any);
      }
    };
  }, [activeIndexState]);

  if (!show) return null;

  return (
    <StaticContainer as="nav" wrapperClass="tabbar" innerClass="tabbar-inner">
      {navItems.map((item, index) => {
        const active = isNavItemActive(pathname, item.path);
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`tab-item-static${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
            data-path={item.path}
            data-index={index}
            style={{ ['--tab-color' as any]: item.color }}
            tabIndex={0}
            role="tab"
            aria-label={`Navigate to ${item.label}`}
            onClick={() => {
              // Dispatch custom event to trigger slide change in AppShell
              window.dispatchEvent(new CustomEvent('monolog:navbar_click', {
                detail: { path: item.path, index }
              }));
            }}
          >
            <div className="tab-icon"><Icon size={20} strokeWidth={2} /></div>
            <span className="tab-label">{item.label}</span>
          </Link>
        );
      })}
      <div
        ref={indicatorRef}
        className="tab-indicator"
        aria-hidden="true"
      />
    </StaticContainer>
  );
}
