import Avatar from "@/components/Avatar";
import type { CompareProfile } from "../data/compareData";

function personaIconEl(name: string) {
  const map: Record<string, string> = {
    users: "M5 6a2 2 0 1 0 0-.01M11 6a2 2 0 1 0 0-.01M2 13a3.5 3.5 0 0 1 6-2M8 11a3.5 3.5 0 0 1 6 2",
    cpu: "M5 5h6v6H5zM6.5 2v2M9.5 2v2M6.5 12v2M9.5 12v2M2 6.5h2M2 9.5h2M12 6.5h2M12 9.5h2",
    moon: "M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5Z",
    pulse: "M1 8h3l2-5 3 10 2-5h3",
    spark: "M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6L8 1Z",
    cube: "M8 1.6 14 5v6l-6 3.4L2 11V5l6-3.4ZM2 5l6 3.4L14 5M8 8.4V15",
  };
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d={map[name] || map.spark} />
    </svg>
  );
}

interface ProfileCardProps {
  profile: CompareProfile;
  palette: "pa" | "pb";
}

export default function ProfileCard({ profile: p, palette }: ProfileCardProps) {
  const pv = `var(--${palette})`;
  const scoreGrad = palette === "pa" ? "linear-gradient(90deg,var(--pa),var(--accent))" : "linear-gradient(90deg,var(--pb),var(--accent))";

  return (
    <div className="hov-card" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "24px", padding: "clamp(22px,3vw,34px)", textAlign: "center" }}>
      <div style={{ margin: "0 auto", width: "84px", borderRadius: "50%", boxShadow: `0 0 0 4px color-mix(in srgb,${pv} 30%,transparent)` }}>
        <Avatar src={p.avatarUrl} initial={p.initial} tint={p.avatar} size={84} alt={p.handle} />
      </div>
      <div style={{ fontSize: "23px", fontWeight: 600, letterSpacing: "-.01em", marginTop: "16px" }}>{p.name}</div>
      <div className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "7px", marginTop: "10px", padding: "5px 13px", borderRadius: "100px", border: `1px solid color-mix(in srgb,${pv} 40%,var(--line))`, background: `color-mix(in srgb,${pv} 12%,transparent)`, fontSize: "12px", fontWeight: 600, letterSpacing: ".04em", color: pv, textTransform: "uppercase" }}>
        {personaIconEl(p.personaKey)}
        {p.persona}
      </div>
      <div className="mono" style={{ marginTop: "12px", fontSize: "14px", color: "var(--accent-ink)" }}>
        {p.handle}
      </div>
      <div style={{ marginTop: "10px", color: "var(--soft)", fontSize: "14.5px", lineHeight: 1.5 }}>{p.bio}</div>
      <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "18px", marginTop: "12px", fontSize: "12.5px", color: "var(--faint)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
            <path d="M8 1.5c2.5 0 4.5 2 4.5 4.5 0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z" />
            <circle cx="8" cy="6" r="1.6" />
          </svg>
          {p.loc}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
            <rect x="2.5" y="3" width="11" height="11" rx="2" />
            <path d="M2.5 6h11M6 1.5v3M10 1.5v3" />
          </svg>
          {p.joined}
        </span>
      </div>
      <div style={{ marginTop: "20px", textAlign: "left" }}>
        <div className="ui" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "11px", letterSpacing: ".1em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600 }}>Dev Score</span>
          <span className="mono" style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
            {p.score}
          </span>
        </div>
        <div style={{ marginTop: "8px", height: "8px", borderRadius: "5px", background: "var(--line)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: "5px", background: scoreGrad, width: p.score + "%" }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "11px", marginTop: "16px" }}>
        <div style={{ background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "14px", padding: "14px 8px" }}>
          <div className="ui" style={{ display: "flex", justifyContent: "center", color: "var(--soft)" }}>
            <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z" />
            </svg>
          </div>
          <div className="mono" style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px" }}>
            {p.reposStr}
          </div>
          <div className="ui" style={{ fontSize: "10px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", marginTop: "2px" }}>
            Repos
          </div>
        </div>
        <div style={{ background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "14px", padding: "14px 8px" }}>
          <div className="ui" style={{ display: "flex", justifyContent: "center", color: "var(--soft)" }}>
            <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="m8 2 1.8 3.7 4.2.6-3 3 .7 4.1L8 11.5 4.3 13.4l.7-4.1-3-3 4.2-.6L8 2Z" />
            </svg>
          </div>
          <div className="mono" style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px" }}>
            {p.starsStr}
          </div>
          <div className="ui" style={{ fontSize: "10px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", marginTop: "2px" }}>
            Stars
          </div>
        </div>
        <div style={{ background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "14px", padding: "14px 8px" }}>
          <div className="ui" style={{ display: "flex", justifyContent: "center", color: "var(--soft)" }}>
            <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <circle cx="8" cy="5" r="2.4" />
              <path d="M3 13a5 5 0 0 1 10 0" />
            </svg>
          </div>
          <div className="mono" style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px" }}>
            {p.followersStr}
          </div>
          <div className="ui" style={{ fontSize: "10px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", marginTop: "2px" }}>
            Followers
          </div>
        </div>
        <div style={{ background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "14px", padding: "14px 8px" }}>
          <div className="ui" style={{ display: "flex", justifyContent: "center", color: "var(--soft)" }}>
            <svg width={15} height={15} viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1c1 2.5-1 3.5-1 5.5C7 8 8 8.6 8 8.6S9.2 7.8 9.5 6c1.3 1 2.5 2.6 2.5 4.6A4 4 0 0 1 4 10.6C4 7 7 5 8 1Z" />
            </svg>
          </div>
          <div className="mono" style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px" }}>
            {p.streakStr}
          </div>
          <div className="ui" style={{ fontSize: "10px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", marginTop: "2px" }}>
            Streak
          </div>
        </div>
      </div>
    </div>
  );
}
