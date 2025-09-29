import dynamic from "next/dynamic";

// Dynamically import the client-side NavBar to avoid calling client-only
// hooks during server rendering (fixes 'useContext of null' errors).
const NavBarClient = dynamic(() => import("./NavBarClient"), { ssr: false });

export function NavBar() {
  return <NavBarClient />;
}

export default NavBar;