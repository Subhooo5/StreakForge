interface RiskIndicatorProps {
  color: string;
  icon: React.ReactNode;
  label: string;
  level: string;
  text: string;
}

export default function RiskIndicator({ color, icon, label, level, text }: RiskIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '14px', borderRadius: '14px', background: 'var(--surface2)', border: '1px solid var(--line2)' }}>
      <span style={{ width: '30px', height: '30px', flex: 'none', borderRadius: '9px', display: 'grid', placeItems: 'center', background: `color-mix(in srgb,${color} 16%,transparent)`, color }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ui" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: '10px', letterSpacing: '.06em', fontWeight: 700, color, textTransform: 'uppercase' }}>{level}</span>
        </div>
        <p style={{ margin: '5px 0 0', fontSize: '12.5px', lineHeight: 1.45, color: 'var(--soft)' }}>{text}</p>
      </div>
    </div>
  );
}
