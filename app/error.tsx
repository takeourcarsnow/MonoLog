"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h2 style={{ marginBottom: "16px", fontSize: "24px", fontWeight: "600" }}>
        Something went wrong
      </h2>
      <p style={{ marginBottom: "24px", color: "var(--muted)", maxWidth: "500px" }}>
        We encountered an unexpected error. This has been logged and we&apos;ll look into it.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "10px 24px",
          background: "var(--primary)",
          color: "white",
          border: "none",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "500",
        }}
      >
        Try again
      </button>
    </div>
  );
}
