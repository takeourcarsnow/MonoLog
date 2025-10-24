"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { lazy } from "react";
import { RESERVED_ROUTES } from "@/src/lib/types";
import { isUsernameRoute } from "@/src/lib/routeUtils";

// Lazy load view components to reduce initial bundle size
const FeedView = lazy(() => import("./FeedView").then(mod => ({ default: mod.FeedView })));
const ExploreView = lazy(() => import("./ExploreView").then(mod => ({ default: mod.ExploreView })));
const Uploader = lazy(() => import("./Uploader").then(mod => ({ default: mod.Uploader })));
const CalendarView = lazy(() => import("./CalendarView").then(mod => ({ default: mod.CalendarView })));
const ProfileView = lazy(() => import("./ProfileView").then(mod => ({ default: mod.ProfileView })));

export const views = [
  { path: "/feed", component: FeedView },
  { path: "/explore", component: ExploreView },
  { path: "/upload", component: Uploader },
  { path: "/calendar", component: CalendarView },
  { path: "/profile", component: ProfileView },
];

export function useAppShellViews() {
  const pathname = usePathname();

  // Calculate current index, treating username routes as profile view (index 4)
  const getCurrentIndex = () => {
    const idx = views.findIndex(v => v.path === pathname);
    if (idx !== -1) return idx;

    // Check if we're on a username route - if so, treat it as profile view
    if (isUsernameRoute(pathname)) {
      return 4; // profile view index
    }

    return 0; // default to feed
  };

  const currentIndex = getCurrentIndex();
  const [activeIndex, setActiveIndex] = useState<number>(currentIndex);

  // Keep activeIndex in sync when currentIndex (route) changes externally
  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  // Treat the root path as a main swipe-view so the homepage renders
  // the same Swiper layout (feed/explore/upload/calendar/profile)
  // as the explicit /feed route. This keeps the caption, view toggle and
  // other layout elements positioned identically between / and /feed.
  // Also treat username routes (e.g., /${username}) as profile view for swipe support.
  const isMainView = pathname === "/" || views.some(v => v.path === pathname) || isUsernameRoute(pathname);

  return { currentIndex, activeIndex, setActiveIndex, isMainView };
}
