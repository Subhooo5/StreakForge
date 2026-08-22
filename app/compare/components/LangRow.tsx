interface LangRowProps {
  name: string;
  color: string;
  aLabel: string;
  bLabel: string;
  aWidthPct: number;
  bWidthPct: number;
}

export default function LangRow({ name, color, aLabel, bLabel, aWidthPct, bWidthPct }: LangRowProps) {
  return (
    <div>
      <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12.5px" }}>
        <span style={{ color: "var(--soft)" }}>{aLabel}</span>
        <span style={{ fontWeight: 600, color: "var(--text)" }}>{name}</span>
        <span style={{ color: "var(--soft)" }}>{bLabel}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginTop: "7px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: aWidthPct + "%", height: "7px", borderRadius: "4px", background: color }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <div style={{ width: bWidthPct + "%", height: "7px", borderRadius: "4px", background: color, opacity: 0.65 }} />
        </div>
      </div>
    </div>
  );
}
