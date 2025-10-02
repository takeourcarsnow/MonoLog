import Link from "next/link";

export default function NotFound() {
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
      <h1 style={{ fontSize: "72px", margin: "0", fontWeight: "700", color: "var(--muted)" }}>
        404
      </h1>
      <h2 style={{ marginTop: "16px", marginBottom: "8px", fontSize: "24px", fontWeight: "600" }}>
        Page Not Found
      </h2>
      <p style={{ marginBottom: "24px", color: "var(--muted)", maxWidth: "500px" }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          padding: "10px 24px",
          background: "var(--primary)",
          color: "white",
          borderRadius: "var(--radius-sm)",
          fontSize: "16px",
          fontWeight: "500",
          display: "inline-block",
        }}
      >
        Go Home
      </Link>
    </div>
  );
}
