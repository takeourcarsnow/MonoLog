"use client";

import { Skeleton } from "@/app/components/ui/Skeleton";

export function CommunitiesSkeleton() {
  return (
    <div className="communities">
      <div className="content-header mt-8 mb-6">
        <div className="text-center w-full">
          <h1 className="content-title inline-flex items-center justify-center gap-2 !font-normal">
            <span className="sr-only">Communities</span>
            <Skeleton width={400} height={16} />
          </h1>
        </div>
      </div>

      <div className="content-actions mt-6 mb-10 flex justify-center w-full">
        <Skeleton width={160} height={36} borderRadius={18} />
      </div>

      <div className="content-body space-y-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card relative">
            <div className="flex flex-col items-center text-center gap-3 py-4">
              {/* Community image */}
              <Skeleton width={80} height={80} borderRadius="50%" />

              {/* Community name */}
              <Skeleton width={200} height={24} />

              {/* Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", width: "100%", maxWidth: "40ch" }}>
                <Skeleton width="100%" height={14} />
                <Skeleton width="80%" height={14} />
              </div>

              {/* Stats */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Skeleton width={14} height={14} borderRadius="50%" />
                  <Skeleton width={30} height={14} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Skeleton width={14} height={14} borderRadius="50%" />
                  <Skeleton width={25} height={14} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Skeleton width={14} height={14} borderRadius="50%" />
                  <Skeleton width={40} height={14} />
                </div>
                <Skeleton width={60} height={14} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}