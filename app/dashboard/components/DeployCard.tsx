interface DeployCardProps {
  name: string;
  url: string;
  ago: string;
  status: string;
  statusColor: string;
}

export default function DeployCard({ name, url, ago, status, statusColor }: DeployCardProps) {
  return (
    <div className="hov-card" style={{ border: "1px solid var(--line2)", borderRadius: "14px", padding: "15px", background: "var(--surface2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="var(--accent-2)" strokeWidth={1.4} style={{ flex: "none" }}>
            <circle cx="4.5" cy="3.5" r="1.6" />
            <circle cx="4.5" cy="12.5" r="1.6" />
            <circle cx="11.5" cy="6" r="1.6" />
            <path d="M4.5 5.1v5.8M4.5 8h4a2.6 2.6 0 0 0 2.6-2.6" />
          </svg>
          <span style={{ fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        </span>
        <span className="ui" style={{ display: "inline-flex", alignItems: "center", gap: "6px", flex: "none", padding: "4px 10px", borderRadius: "100px", background: `color-mix(in srgb,${statusColor} 15%,transparent)`, color: statusColor, fontSize: "11px", fontWeight: 600 }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor }} />
          {status}
        </span>
      </div>
      <div className="ui mono" style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "11px", fontSize: "11px", color: "var(--soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.4} style={{ flex: "none" }}>
          <path d="M6 10 10 6M6.5 4.5H10V8M9.5 11.5H4.5v-5" />
        </svg>
        {url}…
      </div>
      <div className="ui" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "11px", paddingTop: "11px", borderTop: "1px solid var(--line2)" }}>
        <span style={{ fontSize: "10px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", fontWeight: 600 }}>Production</span>
        <span style={{ fontSize: "12px", color: "var(--soft)" }}>{ago}</span>
      </div>
    </div>
  );
}
