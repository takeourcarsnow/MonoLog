import { Skeleton } from "@/app/components/ui/Skeleton";

export function WeekReviewSkeleton() {
  return (
    // Use the same wrapper class as the real page so page-level styles
    // (spacing, max-width) apply to the skeleton. Keep markup minimal so
    // the skeleton renders fast and closely matches the final layout.
    <div className="review-page">
      <div className="review-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <Skeleton width={220} height={28} />
          <Skeleton width={260} height={14} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Skeleton width={72} height={32} borderRadius={8} />
            <Skeleton width={72} height={32} borderRadius={8} />
          </div>
        </div>
      </div>

      {/* Stats grid skeleton: mirrors the StatCard layout */}
      <div className="stats-grid" style={{ marginBottom: 18 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card" style={{ alignItems: 'center' }}>
            <div className="stat-icon">
              <Skeleton width={20} height={20} borderRadius="50%" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <Skeleton width={48} height={22} />
              <Skeleton width={60} height={12} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent posts skeleton: simplified to 4 items so it feels like the
          real content but renders quickly */}
      <div className="highlight-section">
        <div className="top-posts">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="top-post-item">
              <div className="weekday-section">
                <Skeleton width={30} height={16} />
                <Skeleton width={35} height={12} />
              </div>
              <div className="post-thumbnail">
                <Skeleton width={48} height={48} borderRadius={8} />
              </div>
              <div className="post-info">
                <div className="post-caption">
                  <div className="caption-content">
                    <div className="caption-inner">
                      <Skeleton width="92%" height={14} />
                      <Skeleton width="72%" height={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}