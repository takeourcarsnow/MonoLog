import { Skeleton } from "@/app/components/ui/Skeleton";

interface CalendarDaySkeletonProps {
  view: "list" | "grid";
}

export function CalendarDaySkeleton({ view }: CalendarDaySkeletonProps) {
  if (view === "grid") {
    return (
      <div className="grid-view">
        {Array.from({ length: 4 }).map((_, i) => (
          <article key={i} className="post-card">
            <div className="post-header">
              <Skeleton width={40} height={40} borderRadius="50%" />
              <div className="post-meta">
                <Skeleton width={120} height={16} />
              </div>
            </div>
            <div className="post-media">
              <Skeleton width="100%" height={180} borderRadius={8} />
            </div>
            <div className="post-content">
              <Skeleton width="100%" height={16} />
              <Skeleton width="85%" height={16} />
            </div>
            <div className="post-actions">
              <Skeleton width={60} height={24} borderRadius={4} />
            </div>
          </article>
        ))}
      </div>
    );
  }

  // List view
  return (
    <div className="feed">
      {Array.from({ length: 2 }).map((_, i) => (
        <article key={i} className="post-card">
          {/* User Header */}
          <div className="user-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Skeleton width={40} height={40} borderRadius="50%" />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Skeleton width={120} height={16} />
                  <Skeleton width={60} height={12} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Skeleton width={80} height={12} />
                  <Skeleton width={50} height={24} borderRadius={12} />
                </div>
              </div>
            </div>
          </div>

          {/* Media Section */}
          <div className="media-section">
            <Skeleton width="100%" height={300} borderRadius={8} />
          </div>

          {/* Caption */}
          <div className="caption-display" style={{ marginTop: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton width="100%" height={16} />
                  <Skeleton width="85%" height={16} />
                </div>
          </div>

          {/* Actions */}
            <div className="actions-section" style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Skeleton width={60} height={32} borderRadius={16} />
                <div style={{ marginLeft: "auto" }}>
                  <Skeleton width={32} height={32} borderRadius={16} />
                </div>
              </div>
            </div>
        </article>
      ))}
    </div>
  );
}