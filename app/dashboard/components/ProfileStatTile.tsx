interface ProfileStatTileProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

export default function ProfileStatTile({ icon, value, label }: ProfileStatTileProps) {
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "14px", padding: "14px 8px" }}>
      <div className="ui" style={{ display: "flex", justifyContent: "center", color: "var(--soft)" }}>
        {icon}
      </div>
      <div className="mono" style={{ fontSize: "22px", fontWeight: 700, marginTop: "6px" }}>
        {value}
      </div>
      <div className="ui" style={{ fontSize: "10px", letterSpacing: ".08em", color: "var(--faint)", textTransform: "uppercase", marginTop: "2px" }}>
        {label}
      </div>
    </div>
  );
}
