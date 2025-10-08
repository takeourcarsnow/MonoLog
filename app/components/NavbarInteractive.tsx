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

  return null; // This component only adds behavior, no JSX
}