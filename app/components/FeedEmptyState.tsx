import { cloneElement, isValidElement } from "react";
import Link from "next/link";
import { User as UserIcon } from "lucide-react";

interface FeedEmptyStateProps {
  title: React.ReactNode;
  emptyMessage: string;
  viewStorageKey: string;
}

export function FeedEmptyState({ title, emptyMessage, viewStorageKey }: FeedEmptyStateProps) {
  let iconNode: React.ReactNode = null;
  if (isValidElement(title)) {
    try {
      iconNode = cloneElement(title as any, { size: 56, strokeWidth: 1.5 });
    } catch (_) {
      iconNode = null;
    }
  }
  if (!iconNode) iconNode = <UserIcon size={56} strokeWidth={1.5} />;

  const isExplore = viewStorageKey === 'exploreView';

  return (
    <div className="empty feed-empty" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: 16 }} aria-hidden>
          {iconNode}
        </div>

        <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>{isExplore ? 'No posts to explore' : 'Your feed is quiet'}</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>{emptyMessage}</p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
          {!isExplore && (
            <Link href="/explore" className="btn" aria-label="Explore users to follow">Explore users</Link>
          )}
        </div>
      </div>
    </div>
  );
}