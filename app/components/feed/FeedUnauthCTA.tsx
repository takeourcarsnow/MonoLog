import Link from "next/link";

export function FeedUnauthCTA() {
  return (
    <div className="feed-cta" style={{ textAlign: 'center', padding: '20px', margin: '20px 0' }}>
      <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Want to keep scrolling?</p>
      <Link href="/profile" className="btn primary no-effects">Join the Community</Link>
    </div>
  );
}