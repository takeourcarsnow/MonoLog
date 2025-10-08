"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { navItems, isNavItemActive } from "./nav/navHelpers";

export function NavbarInteractive() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavClick = (path: string, index: number) => {
    // Dispatch custom event to trigger slide change in AppShell
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('monolog:navbar_click', {
        detail: { path, index }
      }));
    }
  };

  // Use centralized active logic
  const isActive = React.useCallback((itemPath: string) => isNavItemActive(pathname || '/', itemPath), [pathname]);

  // This component adds click handlers to the static nav items
  React.useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const tabItem = target.closest('.tab-item-static') as HTMLElement;
      if (tabItem) {
        const path = tabItem.dataset.path;
        const index = parseInt(tabItem.dataset.index || '0');
        if (path) {
          e.preventDefault();
          handleNavClick(path, index);
        }
      }
    };

    const tabItems = document.querySelectorAll('.tab-item-static');
    tabItems.forEach(item => {
      item.addEventListener('click', handleClick);
    });

    return () => {
      tabItems.forEach(item => {
        item.removeEventListener('click', handleClick);
      });
    };
  }, []);

  // Add active class to current nav item
  React.useEffect(() => {
    const tabItems = document.querySelectorAll('.tab-item-static');
    tabItems.forEach((item, index) => {
      const tabItem = item as HTMLElement;
      const path = tabItem.dataset.path;
      const isItemActive = path ? isActive(path) : false;

      if (isItemActive) {
        tabItem.classList.add('active');
        tabItem.setAttribute('aria-current', 'page');
      } else {
        tabItem.classList.remove('active');
        tabItem.removeAttribute('aria-current');
      }
    });
  }, [pathname, isActive]);

  // Animated indicator that moves under the active tab and animates color.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const container = document.querySelector('.tabbar-inner') as HTMLElement | null;
    if (!container) return;

    let indicator = container.querySelector('.tab-indicator') as HTMLElement | null;
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'tab-indicator';
      container.appendChild(indicator);
    }

    const getActive = () => document.querySelector('.tab-item-static.active') as HTMLElement | null;

    function update(animate = true) {
      const active = getActive();
      if (!active || !indicator) {
        if (indicator) indicator.style.opacity = '0';
        return;
      }

      const containerRect = container!.getBoundingClientRect();
      const aRect = active.getBoundingClientRect();
      const left = aRect.left - containerRect.left;
      const width = Math.max(28, aRect.width);
      const currIndex = parseInt(active.dataset.index || '0', 10);

      // read previous values before overwriting dataset
      const prevLeftRaw = indicator.dataset.left;
      const prevWidthRaw = indicator.dataset.width;
      const prevIndexRaw = indicator.dataset.prevIndex;
      const prevLeft = prevLeftRaw ? parseFloat(prevLeftRaw) : NaN;
      const prevWidth = prevWidthRaw ? parseFloat(prevWidthRaw) : NaN;
      const prevIndex = prevIndexRaw ? parseInt(prevIndexRaw, 10) : currIndex;

      // color handling: prefer an explicitly stored previous color to avoid flashes
      const computedActive = getComputedStyle(active);
      // Prefer the per-item CSS var --tab-color if present
      const varColor = computedActive.getPropertyValue('--tab-color')?.trim();
      const iconEl = active.querySelector('.tab-icon') as HTMLElement | null;
      const iconColor = iconEl ? getComputedStyle(iconEl).color : '';
      const activeColor = varColor || iconColor || computedActive.color;

      // Read previous color from dataset (most reliable), fallback to computed style
      const prevColorFromDataset = indicator.dataset.color;
      const prevColorComputed = window.getComputedStyle(indicator).backgroundColor;
      const prevColor = prevColorFromDataset || (prevColorComputed && prevColorComputed !== 'rgba(0, 0, 0, 0)' ? prevColorComputed : activeColor);

      // Ensure indicator has inline background before animating to avoid flashes
      if (!indicator.style.backgroundColor) indicator.style.backgroundColor = prevColor;

      // make visible
      indicator.style.opacity = '1';

      if (prefersReduced || !animate) {
        indicator.style.transition = 'none';
        indicator.style.transform = `translateX(${left}px)`;
        indicator.style.width = `${width}px`;
        indicator.style.backgroundColor = activeColor;
        // store current for next run
        indicator.dataset.left = String(left);
        indicator.dataset.width = String(width);
        indicator.dataset.prevIndex = String(currIndex);
        return;
      }

      const distance = Math.abs(currIndex - prevIndex);
      const duration = Math.min(700, 180 + distance * 140);

      try {
        if ('animate' in indicator && typeof (indicator as any).animate === 'function') {
          const overshoot = distance > 1 ? Math.min(0.28, 0.06 * distance) : 0.06;

          const startLeft = isNaN(prevLeft) ? left : prevLeft;
          const startWidth = isNaN(prevWidth) ? width : prevWidth;
          const midLeft = startLeft + (left - startLeft) * 0.6 + (left > startLeft ? overshoot * width : -overshoot * width);
          const midWidth = startWidth + (width - startWidth) * 0.5 + overshoot * 20;

          const frames: any[] = [
            { transform: `translateX(${startLeft}px) scaleX(1)`, width: `${startWidth}px`, backgroundColor: prevColor },
            { transform: `translateX(${midLeft}px) scaleX(${1 + overshoot})`, width: `${midWidth}px`, backgroundColor: prevColor },
            { transform: `translateX(${left}px) scaleX(1)`, width: `${width}px`, backgroundColor: activeColor }
          ];

          // clear CSS transition while using WAAPI so it doesn't fight the animation
          indicator.style.transition = 'none';

          const anim = (indicator as any).animate(frames, {
            duration,
            easing: 'cubic-bezier(.2,1.1,.25,1)',
            fill: 'forwards'
          });

          anim.onfinish = () => {
            // apply final state & store
            indicator!.style.transform = `translateX(${left}px)`;
            indicator!.style.width = `${width}px`;
            indicator!.style.backgroundColor = activeColor;
            indicator!.dataset.color = activeColor;
            indicator!.dataset.left = String(left);
            indicator!.dataset.width = String(width);
            indicator!.dataset.prevIndex = String(currIndex);
          };
          return;
        }
      } catch (e) {
        // fall back to CSS transition below
      }

  // Fallback: smooth CSS transition for transform, width, and background-color
      indicator.style.transition = `transform ${duration}ms cubic-bezier(.2,1.1,.25,1), width ${duration}ms cubic-bezier(.2,1.1,.25,1), background-color ${Math.max(180, duration/2)}ms cubic-bezier(.2,.9,.2,1)`;
      indicator.style.transform = `translateX(${left}px)`;
      indicator.style.width = `${width}px`;
      indicator.style.backgroundColor = activeColor;
  // store current color for next run
  indicator.dataset.color = activeColor;
      // store current for next run
      indicator.dataset.left = String(left);
      indicator.dataset.width = String(width);
      indicator.dataset.prevIndex = String(currIndex);
    }

    // initial update (no animation)
    update(false);

    const onResize = () => update(true);
    window.addEventListener('resize', onResize);
    const onNavClick = () => window.setTimeout(() => update(true), 10);
    window.addEventListener('monolog:navbar_click', onNavClick as EventListener);

    const mo = new MutationObserver(() => update(true));
    mo.observe(container, { attributes: true, subtree: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('monolog:navbar_click', onNavClick as EventListener);
      mo.disconnect();
    };
  }, [pathname]);

  return null; // This component only adds behavior, no JSX
}