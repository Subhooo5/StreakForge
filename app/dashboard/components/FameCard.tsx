interface FameCardProps {
  badge: string;
  color: string;
  icon: React.ReactNode;
  metricLabel: string;
  metric: string;
  sub: string;
  repo: string;
  repoNote: string;
  avatar: string;
  initial: string;
}

export default function FameCard({ badge, color, icon, metricLabel, metric, sub, repo, repoNote, avatar, initial }: FameCardProps) {
  return (
    <div
      className="hov-card"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "22px",
        padding: "26px",
      }}
    >
      <div style={{ position: "absolute", right: "-50px", top: "-50px", width: "180px", height: "180px", background: `radial-gradient(circle,color-mix(in srgb,${color} 22%,transparent),transparent 65%)`, pointerEvents: "none" }} />
      <div className="ui" style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 14px", borderRadius: "100px", border: `1px solid color-mix(in srgb,${color} 40%,var(--line))`, background: `color-mix(in srgb,${color} 12%,transparent)`, fontSize: "11px", letterSpacing: ".08em", color, textTransform: "uppercase", fontWeight: 700 }}>
        {icon}
        {badge}
      </div>
      <div style={{ position: "relative", textAlign: "center", marginTop: "26px" }}>
        <div className="ui" style={{ fontSize: "11px", letterSpacing: ".1em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>
          {metricLabel}
        </div>
        <div className="mono" style={{ fontSize: "60px", fontWeight: 700, lineHeight: 1, marginTop: "10px", color }}>
          {metric}
        </div>
        <div className="ui" style={{ display: "inline-block", marginTop: "14px", padding: "7px 15px", borderRadius: "100px", background: "var(--surface2)", border: "1px solid var(--line2)", fontSize: "12.5px", color: "var(--soft)" }}>
          {sub}
        </div>
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "12px", marginTop: "24px", padding: "14px", borderRadius: "14px", background: "var(--surface2)", border: "1px solid var(--line2)" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", flex: "none", background: avatar, display: "grid", placeItems: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "14px", color: "#fff" }}>{initial}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{repo}</div>
          <div className="ui" style={{ fontSize: "12px", color: "var(--soft)", lineHeight: 1.4 }}>
            {repoNote}
          </div>
        </div>
      </div>
    </div>
  );
}
