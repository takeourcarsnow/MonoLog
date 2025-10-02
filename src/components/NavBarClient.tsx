"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Home, Compass, Plus, Calendar, User } from "lucide-react";

export const tabs = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/upload", label: "Post", icon: Plus },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
];

export function NavBarClient() {
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });
  const [pop, setPop] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username?: string; id?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");

  // Get current user info for profile navigation
  useEffect(() => {
    let mounted = true;
    async function getCurrentUser() {
      try {
        const user = await api.getCurrentUser();
        if (mounted) {
          setCurrentUser(user);
        }
      } catch (e) {
        // User might not be logged in
        if (mounted) {
          setCurrentUser(null);
        }
      }
    }
    getCurrentUser();
    return () => { mounted = false; };
  }, []);

  const handleTabClick = async (href: string) => {
    // Add ripple effect on click
    const clickedButton = document.querySelector(`button[data-href="${href}"]`);
    if (clickedButton) {
      clickedButton.classList.add('ripple');
      setTimeout(() => clickedButton.classList.remove('ripple'), 600);
    }

    // Special handling for profile navigation
    if (href === "/profile") {
      if (currentUser?.username) {
        router.push(`/${currentUser.username}`);
      } else if (currentUser?.id) {
        router.push(`/${currentUser.id}`);
      } else {
        // Fallback to old profile route if no user info
        router.push("/profile");
      }
    } else {
      router.push(href);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const update = () => {
      // Find the icon element inside the active tab so the circular indicator
      // can sit directly behind it and slide between icons.
      const activeIcon = container.querySelector<HTMLElement>(`[href='${pathname}'] .ic`);
      if (!activeIcon) {
        setIndicator(i => ({ ...i, visible: false }));
        return;
      }
      const iconRect = activeIcon.getBoundingClientRect();
      const parentRect = container.getBoundingClientRect();
      const iconLeft = iconRect.left - parentRect.left;
      const iconTop = iconRect.top - parentRect.top;

      // circle size (match .ic visual size plus a little padding)
      const size = 44;
      const left = Math.round(iconLeft + (iconRect.width - size) / 2);
      const top = Math.round(iconTop + (iconRect.height - size) / 2);
      setIndicator({ left, width: size, visible: true });
      // store top as part of width field? Keep indicator state small — we'll set top via CSS variable
      if (container) container.style.setProperty("--indicator-top", `${top}px`);
      if (!prefersReduced) {
        // trigger a short pop animation
        setPop(true);
        window.clearTimeout((update as any)._t);
        (update as any)._t = window.setTimeout(() => setPop(false), 420);
      }
    };

    // Stabilization: re-run measurements a few times after changes to catch
    // late layout shifts (font/image loads, async content). We use small
    // timeouts plus rAF to keep the indicator centered.
    let to1: number | null = null;
    let to2: number | null = null;
    let raf1: number | null = null;
    const stabilize = () => {
      // next frame
      raf1 = window.requestAnimationFrame(() => update());
      // then in short intervals to catch slower shifts
      to1 = window.setTimeout(() => update(), 80) as unknown as number;
      to2 = window.setTimeout(() => update(), 220) as unknown as number;
    };

    // Observe size changes to container or active icon for robust updates
    const ro = new ResizeObserver(() => {
      update();
      stabilize();
    });
    ro.observe(container);

    // Also observe the active icon specifically (if it changes size)
    const observeActiveIcon = () => {
      const activeIcon = container.querySelector<HTMLElement>(`[href='${pathname}'] .ic`);
      if (activeIcon) ro.observe(activeIcon);
    };

    // initial measure + stabilization
    stabilize();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    // re-observe when pathname changes (active icon element will differ)
    observeActiveIcon();

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.clearTimeout((update as any)._t);
      if (to1) window.clearTimeout(to1);
      if (to2) window.clearTimeout(to2);
      if (raf1) window.cancelAnimationFrame(raf1);
      try { ro.disconnect(); } catch (e) { /* ignore */ }
    };
  }, [pathname]);

  return (
    <nav className="tabbar" aria-label="Primary">
      <div className="tabbar-inner" role="tablist" ref={containerRef}>
        {tabs.map(t => {
          // Treat both "/feed" and root path "/" as the Feed tab so clicking the logo
          // (which routes to "/") correctly highlights the Feed icon.
          let isActive = pathname === t.href || (t.href === "/feed" && pathname === "/");
          
          // Special case: treat username routes as active when the Profile tab is selected
          if (t.href === "/profile" && !isActive) {
            // Check if we're on a username route (not one of the reserved routes)
            const pathSegments = pathname.split('/').filter(Boolean);
            if (pathSegments.length === 1) {
              const segment = pathSegments[0];
              const RESERVED_ROUTES = [
                'about', 'api', 'calendar', 'explore', 'favorites', 
                'feed', 'post', 'profile', 'upload'
              ];
              if (!RESERVED_ROUTES.includes(segment.toLowerCase())) {
                isActive = true;
              }
            }
          }
          
          // Update active tab for indicator color
          if (isActive && activeTab !== t.label.toLowerCase()) {
            setActiveTab(t.label.toLowerCase());
          }
          
          return (
            <button
              key={t.href}
              className={`tab-item ${isActive ? "active" : ""}`}
              onClick={() => handleTabClick(t.href)}
              data-href={t.href}
              data-tab={t.label.toLowerCase()}
              role="tab"
              aria-current={isActive ? "page" : undefined}
              aria-label={t.label}
            >
              <div className="ic"><t.icon size={24} strokeWidth={2} /></div>
              <div>{t.label}</div>
            </button>
          );
        })}

        {/* moving indicator */}
        <span
          aria-hidden
          className={`tab-indicator ${pop ? "pop" : ""} ${indicator.visible ? "visible" : ""}`}
          style={{ left: indicator.left ? `${indicator.left}px` : undefined, width: indicator.width ? `${indicator.width}px` : undefined }}
          data-active-tab={activeTab}
        />
      </div>
    </nav>
  );
}

export default NavBarClient;
