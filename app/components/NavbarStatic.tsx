"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "../styles/navbar.css";
import { navItems, isNavItemActive } from "./nav/navHelpers";

interface NavbarStaticProps {
  children?: React.ReactNode;
}

export function NavbarStatic({ children }: NavbarStaticProps) {
  const pathname = usePathname() || "/";

  return (
    <nav className="tabbar">
      <div className="tabbar-inner" aria-label="Main navigation">
        {navItems.map((item, index) => {
          const active = isNavItemActive(pathname, item.path);
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path} className={`tab-item-static${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} data-path={item.path} data-index={index}>
              <div className="tab-icon"><Icon size={20} strokeWidth={2} /></div>
              <span className="tab-label">{item.label}</span>
            </Link>
          );
        })}
        {children}
      </div>
    </nav>
  );
}