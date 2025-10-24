import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty feed-empty" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: '6px 0 0 0', fontSize: '1.15rem' }}>Page not found</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" style={{ marginTop: 8, color: 'var(--link)', textDecoration: 'underline' }}>
          Go home
        </Link>
      </div>
    </div>
  );
}