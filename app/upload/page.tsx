"use client";

import { lazy, Suspense } from "react";
import { LoadingIndicator } from "@/app/components/LoadingIndicator";

// Lazy load the heavy Uploader component
const Uploader = lazy(() => import("@/app/components/Uploader").then(mod => ({ default: mod.Uploader })));

export default function UploadPage() {
  return (
    <Suspense fallback={<LoadingIndicator type="spinner" size="large" className="min-h-screen flex items-center justify-center" />}>
      <Uploader />
    </Suspense>
  );
}
