"use client";

import { Skeleton } from "@/app/components/ui/Skeleton";

export function ProfileSkeleton() {
  return (
    <div className="view-fade">
      <div className="profile-header toolbar">
        <div className="profile-left" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", width: "100%" }}>
          {/* Avatar skeleton */}
          <Skeleton
            width={160}
            height={160}
            borderRadius="50%"
            className="flex-shrink-0"
          />

          <div style={{ textAlign: "center", minWidth: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            {/* Username skeleton */}
            <Skeleton width={120} height={20} />

            {/* Display name skeleton */}
            <Skeleton width={100} height={16} />

            {/* Post count skeleton */}
            <Skeleton width={80} height={14} />

            {/* Bio skeleton */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", width: "100%", maxWidth: 300 }}>
              <Skeleton width="100%" height={14} />
              <Skeleton width="80%" height={14} />
            </div>

            {/* Social links skeleton */}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <Skeleton width={24} height={24} borderRadius="50%" />
              <Skeleton width={24} height={24} borderRadius="50%" />
              <Skeleton width={24} height={24} borderRadius="50%" />
            </div>
          </div>
        </div>

        {/* Actions skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <Skeleton width={100} height={36} borderRadius={18} />
          <Skeleton width={80} height={32} borderRadius={16} />
        </div>
      </div>

      {/* Posts section skeleton */}
      <div style={{ marginTop: 16 }}>
        {/* View toggle skeleton */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          <Skeleton width={20} height={20} />
          <Skeleton width={120} height={16} />
        </div>

        {/* Grid posts skeleton */}
        <div className="feed grid-view" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="tile" style={{ aspectRatio: "1", background: "var(--card-bg)", borderRadius: 8, overflow: "hidden" }}>
              <Skeleton width="100%" height="100%" borderRadius={0} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}