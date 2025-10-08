import { CONFIG } from "@/src/lib/config";

import { StaticContainer } from "./StaticContainer";

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