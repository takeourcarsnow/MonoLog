"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, Search, Plus, Calendar, User } from "lucide-react";
import Link from "next/link";

interface NavbarProps {
  activeIndex?: number;
}

export function Navbar({ activeIndex }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { path: "/feed", icon: Home, label: "Feed", color: "hsl(220, 70%, 50%)" },
    { path: "/explore", icon: Search, label: "Explore", color: "hsl(160, 70%, 45%)" },
    { path: "/upload", icon: Plus, label: "Upload", color: "hsl(280, 70%, 55%)" },
    { path: "/calendar", icon: Calendar, label: "Calendar", color: "hsl(40, 85%, 55%)" },
    { path: "/profile", icon: User, label: "Profile", color: "hsl(320, 70%, 50%)" },
  ];

  const handleNavClick = (path: string, index: number) => {
    // Dispatch custom event to trigger slide change in AppShell
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('monolog:navbar_click', {
        detail: { path, index }
      }));
    }
  };

  // Check if current path matches nav item (including username routes for profile)
  const isActive = (item: typeof navItems[0], index: number) => {
    if (item.path === '/profile') {
      // Profile is active for /profile and username routes
      const pathSegments = pathname.split('/').filter(Boolean);
      return pathname === '/profile' || (pathSegments.length === 1 && ![
        'about', 'api', 'calendar', 'explore', 'favorites',
        'feed', 'post', 'upload', 'admin', 'settings', 'help',
        'terms', 'privacy', 'login', 'register', 'signup', 'signin', 'logout', 'auth'
      ].includes(pathSegments[0]?.toLowerCase()));
    }
    return pathname === item.path || (pathname === '/' && item.path === '/feed');
  };

  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item, index);

          return (
            <button
              key={item.path}
              className={`tab-item ${active ? 'active' : ''}`}
              onClick={() => handleNavClick(item.path, index)}
              style={{
                '--tab-color': item.color,
              } as React.CSSProperties}
              aria-current={active ? 'page' : undefined}
              title={item.label}
            >
              <div className="tab-icon">
                <Icon size={20} strokeWidth={2} />
                {active && (
                  <div
                    className="tab-indicator"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />
                )}
              </div>
              <span className="tab-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}