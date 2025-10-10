// AuthHeaderNotice.tsx
import { HeaderNotice } from "./authHooks";

interface AuthHeaderNoticeProps {
  headerNotice: HeaderNotice | null;
  headerNoticePhase: 'enter' | 'exit';
}

export function AuthHeaderNotice({ headerNotice, headerNoticePhase }: AuthHeaderNoticeProps) {
  if (!headerNotice) return null;

  return (
    <div className={`auth-header-notice ${headerNoticePhase} ${headerNotice.variant || 'info'}`} role="status" aria-live="polite">
      <span className="notice-inner">
        <strong className="notice-title" style={{ fontSize: 20, display: 'block', marginBottom: 4, lineHeight: 1.15 }}>{headerNotice.title}</strong>
        {headerNotice.subtitle && <div className="notice-sub dim" style={{ fontSize: 13, lineHeight: 1.2 }}>{headerNotice.subtitle}</div>}
      </span>
    </div>
  );
}