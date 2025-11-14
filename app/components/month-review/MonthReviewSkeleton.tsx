import { Skeleton } from "@/app/components/ui/Skeleton";

export function MonthReviewSkeleton() {
  return (
    <div className="review-page">
      <div className="review-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <Skeleton width={220} height={28} />
          <Skeleton width={260} height={14} />
        </div>
      </div>

      {/* Stats grid skeleton (reduced) */}
      <div className="stats-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="stat-card">
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

      {/* Insights skeleton (single) */}
      <div className="insights-section">
        <Skeleton width={120} height={20} />
        <div className="insights-grid" style={{ marginTop: 12 }}>
          <div className="insight-card">
            <div className="insight-icon">
              <Skeleton width={24} height={24} borderRadius="50%" />
            </div>
            <div className="insight-content">
              <Skeleton width={120} height={16} />
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">
              <Skeleton width={24} height={24} borderRadius="50%" />
            </div>
            <div className="insight-content">
              <Skeleton width={100} height={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent posts skeleton */}
      <div className="highlight-section">
        <Skeleton width={150} height={24} />
        <div className="recent-posts">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="recent-post-item">
              <Skeleton width={80} height={16} />
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