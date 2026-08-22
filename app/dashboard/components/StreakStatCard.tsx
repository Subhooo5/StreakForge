export interface MiniBar {
  key: number;
  heightPct: number;
  bg: string;
}

interface StreakStatCardProps {
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  value: string;
  sub: string;
  mini: MiniBar[];
}

export default function StreakStatCard({ label, icon, iconColor, value, sub, mini }: StreakStatCardProps) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "24px" }}>
      <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", letterSpacing: ".08em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="mono" style={{ fontSize: "42px", fontWeight: 700, lineHeight: 1, marginTop: "14px" }}>
        {value}
      </div>
      <div className="ui" style={{ fontSize: "13px", color: "var(--soft)", marginTop: "4px" }}>
        {sub}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "38px", marginTop: "16px" }}>
        {mini.map((m) => (
          <div key={m.key} style={{ flex: 1, borderRadius: "2px", background: m.bg, height: `${m.heightPct}%` }} />
        ))}
      </div>
    </div>
  );
}
