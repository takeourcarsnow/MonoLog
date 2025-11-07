import { Skeleton } from "@/app/components/ui/Skeleton";

export function WeekReviewSkeleton() {
  return (
    <div className="week-review-page">
      {/* Stats grid skeleton */}
      <div className="stats-grid">
        {Array.from({ length: 4 }).map((_, i) => (
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

      {/* Recent posts skeleton */}
      <div className="highlight-section">
        <div className="top-posts">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="top-post-item">
              <div className="weekday-section">
                <Skeleton width={30} height={16} />
                <Skeleton width={35} height={12} />
              </div>
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