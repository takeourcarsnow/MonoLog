"use client";

import { Home, Search, Plus, Calendar, User, Compass, type LucideIcon } from "lucide-react";
import { LogoIcon } from "./LogoIcon";

export interface NavItem {
  path: string;
  icon: LucideIcon | React.ComponentType<{size?: number; strokeWidth?: number}>;
  label: string;
  color: string;
}

export const navItems: NavItem[] = [
  { path: "/feed", icon: Home, label: "Feed", color: "hsl(220, 70%, 50%)" },
  { path: "/explore", icon: Compass, label: "Explore", color: "hsl(160, 70%, 45%)" },
  { path: "/upload", icon: LogoIcon, label: "Log", color: "hsl(270, 70%, 50%)" },
  { path: "/calendar", icon: Calendar, label: "Calendar", color: "hsl(40, 85%, 55%)" },
  { path: "/profile", icon: User, label: "Profile", color: "hsl(320, 70%, 50%)" },
];

/**
 * Determine whether a nav item should be considered active given the current pathname.
 * Mirrors the previous project's special-case rules for profile/username routes.
 */
export function isNavItemActive(pathname: string, itemPath: string) {
  if (!pathname) return false;

  if (itemPath === '/profile') {
    if (pathname.startsWith('/profile')) return true;

    const pathSegments = pathname.split('/').filter(Boolean);
    const reserved = [
      'about', 'api', 'calendar', 'explore', 'favorites',
      'feed', 'post', 'upload', 'admin', 'settings', 'help',
      'terms', 'privacy', 'login', 'register', 'signup', 'signin', 'logout', 'auth'
    ];

    return pathname === '/profile' || (pathSegments.length === 1 && !reserved.includes(pathSegments[0]?.toLowerCase()));
  }

  if (pathname === '/' && itemPath === '/feed') return true;
  return pathname === itemPath;
}
