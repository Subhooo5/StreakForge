interface CIHighlightCardProps {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  sub: string;
}

export default function CIHighlightCard({ icon, color, label, value, sub }: CIHighlightCardProps) {
  return (
    <div className="hov-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "20px", boxShadow: "var(--shadow)" }}>
      <div className="ui" style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "12px", color: "var(--soft)", fontWeight: 600 }}>
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-.01em", marginTop: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      <div className="ui mono" style={{ fontSize: "12px", color: "var(--faint)", marginTop: "5px" }}>
        {sub}
      </div>
    </div>
  );
}
