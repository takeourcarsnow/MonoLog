import { ReactNode } from "react";

interface AuthRequiredProps {
  children: ReactNode;
}

export function AuthRequired({ children }: AuthRequiredProps) {
  return (
    <div className="view-fade auth-host auth-centered" style={{ maxWidth: 520 }}>
      {children}
    </div>
  );
}