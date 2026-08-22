interface TrendCardProps {
  cat: string;
  a: string;
  b: string;
  sub: string;
  hotColor: string;
  /** True for the pairings with the most recorded head-to-head battles. */
  hot: boolean;
  go: () => void;
  /** Warms this matchup on hover so the click lands on a resolved result. */
  warm: () => void;
}

export default function TrendCard({ cat, a, b, sub, hotColor, hot, go, warm }: TrendCardProps) {
  return (
    <button onClick={go} onMouseEnter={warm} onFocus={warm} className="hov-card" style={{ flexShrink: 0, width: "280px", textAlign: "left", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="ui" style={{ fontSize: "12px", color: "var(--soft)" }}>
          {cat}
        </span>
        {hot && (
          <span className="mono" style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: ".06em", padding: "3px 8px", borderRadius: "100px", color: hotColor, background: `color-mix(in srgb,${hotColor} 16%,transparent)` }}>
            HOT
          </span>
        )}
      </div>
      <div className="ui" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px", fontSize: "17px", fontWeight: 600 }}>
        <span>{a}</span>
        <span className="mono" style={{ fontSize: "11px", fontWeight: 700, color: "var(--pa)", background: "color-mix(in srgb,var(--pa) 15%,transparent)", padding: "3px 7px", borderRadius: "6px" }}>
          VS
        </span>
        <span>{b}</span>
      </div>
      <div className="ui" style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--line2)", textAlign: "center", fontSize: "13px", color: "var(--soft)" }}>
        {sub}
      </div>
    </button>
  );
}
