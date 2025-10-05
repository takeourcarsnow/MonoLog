"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

// Unique color palette for each section
const colorMap: Record<string, string> = {
  feed: 'var(--primary)',      // blue
  explore: '#8b5cf6',           // violet
  post: 'var(--accent)',        // green
  calendar: '#f59e0b',          // amber
  profile: 'var(--danger)',     // red
};

export function NavBarClient() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<{ username?: string; id?: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Simplified active tab detection
  const detectActive = (p: string) => {
    if (p === "/" || p === "/feed") return "feed";
    if (p === "/explore") return "explore";
    if (p === "/upload") return "post";
    if (p === "/profile") return "profile";
    if (p === "/calendar") return "calendar";

    // Profile detection - check if it's a user profile route
    const segments = p.split('/').filter(Boolean);
    if (segments.length === 1) {
      const segment = segments[0];
      const reserved = ['about', 'api', 'calendar', 'explore', 'favorites', 'feed', 'post', 'profile', 'upload'];
      if (!reserved.includes(segment.toLowerCase())) {
        return "profile";
      }
    }

    return "feed"; // default
  };

  useEffect(() => {
    setMounted(true);
    setActiveTab(detectActive(pathname));
  }, [pathname]);

  // Listen for swiper slide changes
  useEffect(() => {
    const handleSlideChange = (e: CustomEvent) => {
      const { path } = e.detail;
      setActiveTab(detectActive(path || ""));
    };

    window.addEventListener('monolog:slide_change', handleSlideChange as any);
    return () => window.removeEventListener('monolog:slide_change', handleSlideChange as any);
  }, []);

  // Get current user info
  useEffect(() => {
    let mounted = true;
    api.getCurrentUser()
      .then(user => mounted && setCurrentUser(user))
      .catch(() => mounted && setCurrentUser(null));
    return () => { mounted = false; };
  }, []);

  const handleTabClick = async (href: string) => {
    if (href === "/profile") {
      try {
        const user = await api.getCurrentUser();
        if (user?.username) {
          router.push(`/${user.username}`);
          return;
        }
        if (user?.id) {
          router.push(`/${user.id}`);
          return;
        }
      } catch (e) {
        // fallback
      }
      if (currentUser?.username) {
        router.push(`/${currentUser.username}`);
      } else if (currentUser?.id) {
        router.push(`/${currentUser.id}`);
      } else {
        router.push("/profile");
      }
    } else {
      router.push(href);
    }
  };

  const nav = (
    <nav className="tabbar" aria-label="Primary navigation">
      {/* set --active-color at container level so CSS that references it uses the current section color */}
      <div
        className="tabbar-inner"
        role="tablist"
        style={({ ['--active-color']: colorMap[activeTab] || 'var(--primary)' } as React.CSSProperties)}
      >
        {tabs.map((tab, index) => {
          const key = tab.label.toLowerCase();
          const isActive = activeTab === key;
          // pick color for this tab (fallback to primary)
          const tabColor = colorMap[key] || 'var(--primary)';

          return (
            <button
              key={tab.href}
              className={`tab-item ${isActive ? "active" : ""}`}
              onClick={() => handleTabClick(tab.href)}
              role="tab"
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              // when active, set the --active-color so CSS uses the tab's unique color
              style={isActive ? ({ ['--active-color']: tabColor } as React.CSSProperties) : undefined}
            >
              <div className="tab-icon">
                <tab.icon size={24} strokeWidth={2} />
              </div>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  if (!mounted) return null;
  return createPortal(nav, document.body);
}

export default NavBarClient;
