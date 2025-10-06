import { NavbarStatic } from "./NavbarStatic";
import { NavbarInteractive } from "./NavbarInteractive";

interface NavbarProps {
  activeIndex?: number;
}

export function Navbar({ activeIndex }: NavbarProps) {
  return (
    <NavbarStatic>
      <NavbarInteractive />
    </NavbarStatic>
  );
}
