import Avatar from "@/components/Avatar";
interface LegendCardProps {
  name: string;
  handle: string;
  role: string;
  followers: string;
  lang: string;
  initial: string;
  avatar: string;
  avatarUrl: string;
}

export default function LegendCard({ name, handle, role, followers, lang, initial, avatar, avatarUrl }: LegendCardProps) {
  return (
    <div className="hov-card" style={{ flexShrink: 0, width: "300px", display: "flex", alignItems: "center", gap: "14px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "18px" }}>
      {}
      <Avatar src={avatarUrl} initial={initial} tint={avatar} size={50} alt={handle} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div className="mono" style={{ fontSize: "11.5px", color: "var(--accent-ink)" }}>
          {handle}
        </div>
        <div className="ui" style={{ fontSize: "11.5px", color: "var(--soft)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {role}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: "16px", fontWeight: 700 }}>
          {followers}
        </div>
        <div className="ui" style={{ fontSize: "9px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase" }}>
          Followers
        </div>
        <div className="ui" style={{ marginTop: "6px", fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "var(--surface2)", border: "1px solid var(--line2)", color: "var(--soft)" }}>
          {lang}
        </div>
      </div>
    </div>
  );
}
