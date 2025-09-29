"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/feed", label: "Feed", icon: "🏠" },
  { href: "/explore", label: "Explore", icon: "🧭" },
  { href: "/favorites", label: "Favorites", icon: "⭐" },
  { href: "/upload", label: "Post", icon: "➕" },
  { href: "/calendar", label: "Calendar", icon: "🗓️" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export function NavBarClient() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Primary">
      <div className="tabbar-inner" role="tablist">
        {tabs.map(t => {
          const isActive = pathname === t.href;
          return (
            <Link
              key={t.href}
              className={`tab-item ${isActive ? "active" : ""}`}
              href={t.href}
              role="tab"
              aria-current={isActive ? "page" : undefined}
              aria-label={t.label}
            >
              <div className="ic">{t.icon}</div>
              <div>{t.label}</div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default NavBarClient;
