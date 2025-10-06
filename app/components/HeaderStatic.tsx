import { CONFIG } from "@/src/lib/config";

interface HeaderStaticProps {
  children: React.ReactNode;
}

export function HeaderStatic({ children }: HeaderStaticProps) {
  return (
    <header className="header">
      <div className="header-inner">
        {children}
      </div>
    </header>
  );
}