"use client";

export default function TabLoader({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "18px",
        minHeight: "clamp(320px,52vh,560px)",
        padding: "clamp(28px,6vw,72px) 0",
        textAlign: "center",
      }}
    >
      <svg
        width={34}
        height={34}
        viewBox="0 0 16 16"
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth={1.5}
        style={{ animation: "sf-spin 1s linear infinite" }}
      >
        <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" strokeLinecap="round" />
      </svg>
      <div className="ui" style={{ fontSize: "15.5px", fontWeight: 600, letterSpacing: "-.01em", color: "var(--text)" }}>
        {label}
      </div>
    </div>
  );
}
