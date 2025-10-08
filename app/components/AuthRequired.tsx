import { ReactNode } from "react";

interface AuthRequiredProps {
  children: ReactNode;
}

export function AuthRequired({ children }: AuthRequiredProps) {
  return (
    <div className="view-fade auth-host" style={{ maxWidth: 520, margin: "28px auto 32px", textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      {children}
    </div>
  );
}