interface PRHighlightCardProps {
  icon: React.ReactNode;
  color: string;
  label: string;
  metric: string;
  desc: string;
}

export default function PRHighlightCard({ icon, color, label, metric, desc }: PRHighlightCardProps) {
  return (
    <div className="hov-card" style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "22px", boxShadow: "var(--shadow)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "inline-flex", color, transform: "scale(1.7)", transformOrigin: "left center", marginLeft: "3px" }}>{icon}</span>
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.6}>
          <path d="M3 8h9M8 4l4 4-4 4" />
        </svg>
      </div>
      <div className="ui" style={{ fontSize: "12px", color: "var(--soft)", fontWeight: 600, marginTop: "16px" }}>
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-.01em", marginTop: "4px", color }}>{metric}</div>
      <div className="ui mono" style={{ fontSize: "12px", color: "var(--faint)", marginTop: "8px", lineHeight: 1.45 }}>
        {desc}
      </div>
    </div>
  );
}
