import { HeaderStatic } from "@/app/components/layout/HeaderStatic";
import { HeaderInteractive } from "@/app/components/layout/HeaderInteractive";

export function Header() {
  return (
    <HeaderStatic>
      <HeaderInteractive />
    </HeaderStatic>
  );
}
