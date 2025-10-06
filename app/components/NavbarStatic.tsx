import { Home, Search, Plus, Calendar, User } from "lucide-react";

const navItems = [
  { path: "/feed", icon: Home, label: "Feed", color: "hsl(220, 70%, 50%)" },
  { path: "/explore", icon: Search, label: "Explore", color: "hsl(160, 70%, 45%)" },
  { path: "/upload", icon: Plus, label: "Upload", color: "hsl(280, 70%, 55%)" },
  { path: "/calendar", icon: Calendar, label: "Calendar", color: "hsl(40, 85%, 55%)" },
  { path: "/profile", icon: User, label: "Profile", color: "hsl(320, 70%, 50%)" },
];

interface NavbarStaticProps {
  children?: React.ReactNode;
}

export function NavbarStatic({ children }: NavbarStaticProps) {
  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {navItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={item.path}
              className="tab-item-static"
              style={{
                '--tab-color': item.color,
              } as React.CSSProperties}
              data-path={item.path}
              data-index={index}
            >
              <div className="tab-icon">
                <Icon size={20} strokeWidth={2} />
              </div>
              <span className="tab-label">{item.label}</span>
            </div>
          );
        })}
        {children}
      </div>
    </nav>
  );
}