"use client";

import { Skeleton } from "@/app/components/ui/Skeleton";

export function CommunitySkeleton() {
  return (
    <div className="community pt-0 md:pt-20">
      {/* Create Thread Button */}
      <div style={{ marginTop: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
        <Skeleton width={140} height={36} borderRadius={18} />
      </div>

      {/* Back Navigation */}
      <div style={{ marginTop: '2rem', marginBottom: '1rem', textAlign: 'center' }}>
        <Skeleton width={80} height={16} />
      </div>

      {/* Community Header */}
      <div className="card relative">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          {/* Community image */}
          <Skeleton width={80} height={80} borderRadius="50%" />

          {/* Community name */}
          <Skeleton width={250} height={32} />

          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", width: "100%", maxWidth: "60ch" }}>
            <Skeleton width="100%" height={16} />
            <Skeleton width="90%" height={16} />
            <Skeleton width="70%" height={16} />
          </div>

          {/* Stats */}
          <div className="flex flex-col items-center gap-2 mt-2 text-sm">
            <div className="flex items-center gap-4 justify-center">
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Skeleton width={14} height={14} borderRadius="50%" />
                <Skeleton width={40} height={14} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Skeleton width={14} height={14} borderRadius="50%" />
                <Skeleton width={35} height={14} />
              </div>
            </div>
            <Skeleton width={100} height={14} />
          </div>
        </div>
      </div>

      {/* Threads List (simplified) */}
      <div className="content-body space-y-6 pt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card block thread-card relative">
            <div className="flex items-center justify-center">
              <div className="flex-1 min-w-0 text-center">
                {/* Thread title */}
                <div style={{ marginBottom: 8 }}>
                  <Skeleton width={260} height={20} />
                </div>

                {/* Thread content */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", width: "100%" }}>
                  <Skeleton width="92%" height={14} />
                </div>

                {/* Thread stats (reduced) */}
                <div className="flex flex-col items-center gap-2 mt-2 text-sm">
                  <div className="flex items-center gap-4 justify-center">
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Skeleton width={14} height={14} borderRadius="50%" />
                      <Skeleton width={22} height={14} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Skeleton width={14} height={14} borderRadius="50%" />
                      <Skeleton width={48} height={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}