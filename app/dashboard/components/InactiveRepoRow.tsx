interface InactiveRepoRowProps {
  name: string;
  date: string;
  days: string;
}

export default function InactiveRepoRow({ name, date, days }: InactiveRepoRowProps) {
  return (
    <div className="hov-card" style={{ display: "flex", alignItems: "center", gap: "11px", border: "1px solid var(--line2)", borderRadius: "12px", padding: "11px 13px", background: "var(--surface2)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mono" style={{ fontSize: "12.5px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </div>
        <div className="ui" style={{ fontSize: "10.5px", color: "var(--faint)", marginTop: "2px" }}>
          Last push {date}
        </div>
      </div>
      <span className="ui mono" style={{ flex: "none", fontSize: "11px", fontWeight: 700, color: "var(--accent-2)" }}>
        {days}
      </span>
      <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.6} style={{ flex: "none" }}>
        <path d="M6 3l5 5-5 5" />
      </svg>
    </div>
  );
}
