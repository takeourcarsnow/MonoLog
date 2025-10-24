import { RESERVED_ROUTES } from "@/src/lib/types";

export function isUsernameRoute(pathname: string): boolean {
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length === 1) {
    const segment = pathSegments[0];
    return !RESERVED_ROUTES.includes(segment.toLowerCase());
  }
  return false;
}

export function getUsernameFromRoute(pathname: string): string | null {
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length === 1) {
    const segment = pathSegments[0];
    if (!RESERVED_ROUTES.includes(segment.toLowerCase())) {
      return segment;
    }
  }
  return null;
}