import type { ReactNode } from "react";

interface StatRowProps {
  icon: ReactNode;
  label: string;
  aVal: string;
  bVal: string;
  aColor: string;
  bColor: string;
  aWidthPct: number;
  bWidthPct: number;
  aBg: string;
  bBg: string;
}

export default function StatRow({ icon, label, aVal, bVal, aColor, bColor, aWidthPct, bWidthPct, aBg, bBg }: StatRowProps) {
  return (
    <div className="hov-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "20px" }}>
      <div className="ui" style={{ display: "flex", alignItems: "center", gap: "9px", color: "var(--soft)" }}>
        {icon}
        <span style={{ fontSize: "11.5px", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
      </div>
      <div className="mono" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", fontSize: "28px", fontWeight: 700 }}>
        <span style={{ color: aColor }}>{aVal}</span>
        <span style={{ color: bColor }}>{bVal}</span>
      </div>
      <div style={{ display: "flex", gap: "3px", marginTop: "12px", height: "7px" }}>
        <div style={{ width: aWidthPct + "%", background: aBg, borderRadius: "4px 0 0 4px" }} />
        <div style={{ width: bWidthPct + "%", background: bBg, borderRadius: "0 4px 4px 0" }} />
      </div>
    </div>
  );
}
