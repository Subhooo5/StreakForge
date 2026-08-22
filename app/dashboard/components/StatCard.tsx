interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  delta?: string;
}

export default function StatCard({ icon, label, value, color, delta }: StatCardProps) {
  return (
    <div
      className="hov-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "18px",
        padding: "20px",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
        <span style={{ display: "inline-flex", flex: "none", color, transform: "scale(1.35)", transformOrigin: "center" }}>{icon}</span>
        <span className="ui" style={{ fontSize: "11px", letterSpacing: ".06em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <div className="mono" style={{ fontSize: "34px", fontWeight: 700, marginTop: "14px", lineHeight: 1, color }}>
        {value}
      </div>
      {delta && (
        <div className="ui" style={{ display: "inline-block", marginTop: "10px", padding: "4px 10px", borderRadius: "100px", background: "color-mix(in srgb,var(--pc) 14%,transparent)", color: "var(--pc)", fontSize: "11.5px", fontWeight: 600 }}>
          {delta}
        </div>
      )}
    </div>
  );
}
