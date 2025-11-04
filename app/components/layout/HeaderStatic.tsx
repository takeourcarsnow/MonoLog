import { CONFIG } from "@/lib/config";

import { StaticContainer } from "@/app/components/ui/StaticContainer";

interface HeaderStaticProps {
  children: React.ReactNode;
}

export function HeaderStatic({ children }: HeaderStaticProps) {
  return (
    <StaticContainer as="header" wrapperClass="header" innerClass="header-inner">
      {children}
    </StaticContainer>
  );
}