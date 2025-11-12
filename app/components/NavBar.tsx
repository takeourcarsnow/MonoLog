"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isNavItemActive } from "./nav/navHelpers";
import { useCameraContext } from "./context/CameraContext";

interface NavItemProps {
  path: string;
  label: string;
  icon: any;
  color: string;
  active: boolean;
}

const NavItem = React.memo(function NavItem({ path, label, icon: Icon, color, active }: NavItemProps) {
  const style = useMemo(() => ({ ['--tab-color' as any]: color }), [color]);
  return (
    <Link
      key={path}
      href={path}
      prefetch={false}
      className={`tab-item-static${active ? ' active' : ''}`}
      style={style}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
    >
      <div className="tab-icon"><Icon size={20} strokeWidth={2} /></div>
      <span className="tab-label">{label}</span>
    </Link>
  );
});

export function Navbar() {
  const pathname = usePathname() || "/";
  const { isCameraOpen } = useCameraContext();

  if (isCameraOpen) return null;

  const items = navItems.map((item) => {
    const active = isNavItemActive(pathname, item.path);
    return (
      <NavItem
        key={item.path}
        path={item.path}
        label={item.label}
        icon={item.icon}
        color={item.color}
        active={active}
      />
    );
  });

  return (
    <nav className="tabbar" role="navigation" aria-label="Primary">
      {items}
    </nav>
  );
}