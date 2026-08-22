interface InsightRowProps {
  icon: React.ReactNode;
  text: string;
}

export default function InsightRow({ icon, text }: InsightRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "11px", padding: "13px", borderRadius: "13px", background: "var(--surface2)", border: "1px solid var(--line2)" }}>
      <span style={{ color: "var(--accent-ink)", flex: "none", marginTop: "1px" }}>{icon}</span>
      <span style={{ fontSize: "13.5px", lineHeight: 1.45, color: "var(--soft)" }}>{text}</span>
    </div>
  );
}
