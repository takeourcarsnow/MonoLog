import { HeaderStatic } from "./HeaderStatic";
import { HeaderInteractive } from "./HeaderInteractive";

export function Header() {
  return (
    <HeaderStatic>
      <HeaderInteractive />
    </HeaderStatic>
  );
}
