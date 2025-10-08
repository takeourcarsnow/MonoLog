"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "../styles/navbar.css";
import { navItems, isNavItemActive, type NavItem } from "./nav/navHelpers";
import { StaticContainer } from "./StaticContainer";

interface NavbarStaticProps {
  children?: React.ReactNode;
}

export function NavbarStatic({ children }: NavbarStaticProps) {
  const pathname = usePathname() || "/";

  return (
    <StaticContainer as="nav" wrapperClass="tabbar" innerClass="tabbar-inner">
      <>
        {navItems.map((item, index) => {
          const active = isNavItemActive(pathname, item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`tab-item-static${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
              data-path={item.path}
              data-index={index}
              style={{ ['--tab-color' as any]: item.color }}
              tabIndex={0}
              role="tab"
              aria-label={`Navigate to ${item.label}`}
            >
              <div className="tab-icon"><Icon size={20} strokeWidth={2} /></div>
              <span className="tab-label">{item.label}</span>
            </Link>
          );
        })}
        {children}
      </>
    </StaticContainer>
  );
}