"use client";

import { Skeleton } from "@/app/components/ui/Skeleton";

export function FollowingSkeleton() {
  return (
    <div className="view-fade">
      <div style={{ padding: '20px', maxWidth: 800, margin: '0 auto' }}>
        <div className="grid" style={{ gap: 16, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16, textAlign: 'center' }}>
              {/* Avatar */}
              <Skeleton width={48} height={48} borderRadius="50%" />

              {/* User info */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Skeleton width={100} height={16} />
                <Skeleton width={80} height={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}