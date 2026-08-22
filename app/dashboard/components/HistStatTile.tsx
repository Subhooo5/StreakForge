interface HistStatTileProps {
  label: React.ReactNode;
  value: string;
  sub: React.ReactNode;
  valueColor?: string;
}

export default function HistStatTile({ label, value, sub, valueColor }: HistStatTileProps) {
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "14px", padding: "15px" }}>
      {label}
      <div className="mono" style={{ fontSize: "26px", fontWeight: 700, marginTop: "6px", ...(valueColor ? { color: valueColor } : {}) }}>
        {value}
      </div>
      <div className="ui" style={{ fontSize: "10.5px", color: "var(--faint)", marginTop: "4px" }}>
        {sub}
      </div>
    </div>
  );
}
