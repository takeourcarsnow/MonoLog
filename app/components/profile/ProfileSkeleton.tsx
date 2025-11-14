"use client";

import { Skeleton } from "@/app/components/ui/Skeleton";

export function ProfileSkeleton() {
  return (
    // Use `profile-page` wrapper so global page spacing/scroll rules apply
    <div className="profile-page view-fade">
      <div className="profile-header toolbar">
        <div className="profile-left" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", width: "100%" }}>
          {/* Avatar skeleton */}
          <Skeleton
            width={140}
            height={140}
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
    </div>
  );
}