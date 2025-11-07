import { Skeleton } from "@/app/components/ui/Skeleton";

export function ThreadSkeleton() {
  return (
    <div className="content thread">
      {/* Back Navigation */}
      <div style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
        <Skeleton width={60} height={16} />
      </div>

      {/* Thread Header Card */}
      <div className="card relative">
        <div className="flex flex-col items-center text-center gap-3 py-3">
          <Skeleton width={300} height={32} />
          <div className="flex flex-col items-center gap-2 mt-1">
            <div className="flex items-center gap-4 justify-center">
              <Skeleton width={100} height={16} />
              <Skeleton width={80} height={16} />
            </div>
            <Skeleton width={120} height={16} />
          </div>
        </div>
        <div className="mt-2">
          <Skeleton width="100%" height={20} />
          <Skeleton width="90%" height={20} />
          <Skeleton width="80%" height={20} />
        </div>
      </div>

      {/* Replies Section */}
      <div className="content-body mt-8">
        {/* Reply Form */}
        <div className="card mb-6">
          <Skeleton width="100%" height={80} borderRadius={6} />
          <div className="flex justify-end mt-3">
            <Skeleton width={80} height={36} borderRadius={6} />
          </div>
        </div>

        {/* Replies List */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card mb-4">
            <div className="flex items-start gap-3">
              <Skeleton width={40} height={40} borderRadius="50%" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton width={100} height={16} />
                  <Skeleton width={60} height={14} />
                </div>
                <div className="space-y-1">
                  <Skeleton width="100%" height={16} />
                  <Skeleton width="85%" height={16} />
                  <Skeleton width="70%" height={16} />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Skeleton width={50} height={24} borderRadius={4} />
                  <Skeleton width={50} height={24} borderRadius={4} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}