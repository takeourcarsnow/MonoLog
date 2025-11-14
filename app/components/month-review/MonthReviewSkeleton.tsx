import { Skeleton } from "@/app/components/ui/Skeleton";

export function MonthReviewSkeleton() {
  return (
    <div className="month-review-page">
      <div className="month-header">
        <Skeleton width={200} height={32} />
        <Skeleton width={300} height={20} />
      </div>

      {/* Stats grid skeleton */}
      <div className="stats-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon">
              <Skeleton width={20} height={20} borderRadius="50%" />
            </div>
            <div className="stat-content">
              <Skeleton width={80} height={14} />
              <Skeleton width={40} height={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Insights skeleton */}
      <div className="insights-section">
        <Skeleton width={100} height={24} />
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">
              <Skeleton width={24} height={24} borderRadius="50%" />
            </div>
            <div className="insight-content">
              <Skeleton width={120} height={16} />
              <Skeleton width={80} height={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent posts skeleton */}
      <div className="highlight-section">
        <Skeleton width={150} height={24} />
        <div className="recent-posts">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="recent-post-item">
              <Skeleton width={80} height={16} />
              <div className="post-thumbnail">
                <Skeleton width={48} height={48} borderRadius={4} />
              </div>
              <div className="post-info">
                <div className="post-caption">
                  <div className="caption-content">
                    <div className="caption-inner">
                      <Skeleton width="100%" height={14} />
                      <Skeleton width="80%" height={14} />
                      <Skeleton width="60%" height={14} />
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