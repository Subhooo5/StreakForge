interface PopularRepoCardProps {
  name: string;
  stars: number;
  desc: string;
}

export default function PopularRepoCard({ name, stars, desc }: PopularRepoCardProps) {
  return (
    <div className="hov-card" style={{ border: "1px solid var(--line2)", borderRadius: "14px", padding: "14px", background: "var(--surface2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <span className="mono" style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </span>
        <span className="ui mono" style={{ display: "inline-flex", alignItems: "center", gap: "4px", flex: "none", fontSize: "11.5px", color: "var(--accent-2)" }}>
          <svg width={11} height={11} viewBox="0 0 16 16" fill="currentColor">
            <path d="m8 1.8 1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.9 4.3 14.2l.8-4.2L2 7.1l4.2-.5L8 1.8Z" />
          </svg>
          {stars}
        </span>
      </div>
      <p className="ui" style={{ margin: "7px 0 0", fontSize: "11.5px", lineHeight: 1.45, color: "var(--soft)" }}>
        {desc}
      </p>
    </div>
  );
}
