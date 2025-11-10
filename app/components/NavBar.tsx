"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isNavItemActive } from "./nav/navHelpers";
import { useCameraContext } from "./context/CameraContext";

export function Navbar() {
  const pathname = usePathname() || "/";
  const { isCameraOpen } = useCameraContext();

  if (isCameraOpen) return null;

  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {navItems.map((item, index) => {
          const active = isNavItemActive(pathname, item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`tab-item-static${active ? ' active' : ''}`}
              style={{ ['--tab-color' as any]: item.color }}
            >
              <div className="tab-icon"><Icon size={20} strokeWidth={2} /></div>
              <span className="tab-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}