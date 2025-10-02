export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <div
        className="spinner"
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid var(--border)",
          borderTop: "3px solid var(--primary)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
