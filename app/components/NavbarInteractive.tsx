"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { navItems, isNavItemActive, type NavItem } from "./nav/navHelpers";

interface NavItemRef {
  element: HTMLElement;
  path: string;
  index: number;
}

export function NavbarInteractive() {
  const router = useRouter();
  const pathname = usePathname();
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [navItemRefs, setNavItemRefs] = useState<NavItemRef[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Update active index when pathname changes
  useEffect(() => {
    const currentPath = pathname || '/';
    const index = navItems.findIndex(item => isNavItemActive(currentPath, item.path));
    setActiveIndex(index);
  }, [pathname]);

  // Handle navigation click
  const handleNavClick = useCallback((path: string, index: number) => {
    // Dispatch custom event to trigger slide change in AppShell
    window.dispatchEvent(new CustomEvent('monolog:navbar_click', {
      detail: { path, index }
    }));
  }, []);

  // Set up nav item refs when component mounts
  useEffect(() => {
    // Find the tabbar-inner container (parent of this component)
    const container = indicatorRef.current?.parentElement;
    if (!container) return;

    const items = container.querySelectorAll('.tab-item-static');
    const refs: NavItemRef[] = Array.from(items).map((element, index) => {
      const htmlElement = element as HTMLElement;
      return {
        element: htmlElement,
        path: htmlElement.dataset.path || '',
        index: parseInt(htmlElement.dataset.index || '0')
      };
    });

    setNavItemRefs(refs);
  }, []);

  // Handle click events using event delegation
  useEffect(() => {
    const container = indicatorRef.current?.parentElement;
    if (!container) return;

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

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [handleNavClick]);

  // Update active states and indicator position
  useEffect(() => {
    const container = indicatorRef.current?.parentElement;
    if (!container || navItemRefs.length === 0) return;

    const updateIndicator = () => {
      const indicator = indicatorRef.current;
      if (!indicator) return;

      // Update active classes
      navItemRefs.forEach((ref, index) => {
        const isActive = index === activeIndex;
        ref.element.classList.toggle('active', isActive);
        ref.element.setAttribute('aria-current', isActive ? 'page' : 'false');
      });

      // Update indicator
      if (activeIndex >= 0) {
        const activeItem = navItemRefs[activeIndex];
        if (activeItem) {
          const containerRect = container.getBoundingClientRect();
          const itemRect = activeItem.element.getBoundingClientRect();
          const left = itemRect.left - containerRect.left;
          const itemCenter = left + itemRect.width / 2;
          const width = 28; // Fixed width for consistent centering
          const indicatorLeft = itemCenter - width / 2;

          // Get color from CSS custom property or computed style
          const computedStyle = getComputedStyle(activeItem.element);
          const color = computedStyle.getPropertyValue('--tab-color').trim() ||
                       getComputedStyle(activeItem.element.querySelector('.tab-icon') || activeItem.element).color;

          // Animate indicator
          const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

          if (prefersReduced) {
            indicator.style.transition = 'none';
            indicator.style.transform = `translateX(${indicatorLeft}px)`;
            indicator.style.width = `${width}px`;
            indicator.style.backgroundColor = color;
            indicator.style.opacity = '1';
          } else {
            indicator.style.transition = 'transform 300ms cubic-bezier(.2,1.1,.25,1), width 300ms cubic-bezier(.2,1.1,.25,1), background-color 200ms ease';
            indicator.style.transform = `translateX(${indicatorLeft}px)`;
            indicator.style.width = `${width}px`;
            indicator.style.backgroundColor = color;
            indicator.style.opacity = '1';
          }
        }
      } else {
        indicator.style.opacity = '0';
      }
    };

    updateIndicator();

    // Update indicator on window resize
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [activeIndex, navItemRefs]);

  // Handle keyboard navigation
  useEffect(() => {
    const container = indicatorRef.current?.parentElement;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tabItems = container.querySelectorAll('.tab-item-static');
      const currentActive = container.querySelector('.tab-item-static.active') as HTMLElement;
      let currentIndex = -1;

      if (currentActive) {
        currentIndex = Array.from(tabItems).indexOf(currentActive);
      }

      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newIndex = Math.min(tabItems.length - 1, currentIndex + 1);
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = tabItems.length - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (currentActive) {
            const path = currentActive.dataset.path;
            const index = parseInt(currentActive.dataset.index || '0');
            if (path) {
              handleNavClick(path, index);
            }
          }
          return;
        default:
          return;
      }

      if (newIndex !== currentIndex && newIndex >= 0) {
        const newActive = tabItems[newIndex] as HTMLElement;
        const path = newActive.dataset.path;
        const index = parseInt(newActive.dataset.index || '0');
        if (path) {
          handleNavClick(path, index);
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleNavClick]);

  return (
    <div
      ref={indicatorRef}
      className="tab-indicator"
      aria-hidden="true"
    />
  );
}