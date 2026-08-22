interface RecCardProps {
  icon: React.ReactNode;
  title: string;
  text: string;
}

export default function RecCard({ icon, title, text }: RecCardProps) {
  return (
    <div className="hov-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '18px', padding: '22px' }}>
      <span style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'grid', placeItems: 'center', background: 'color-mix(in srgb,var(--accent) 13%,transparent)', color: 'var(--accent-ink)' }}>{icon}</span>
      <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-.01em', marginTop: '14px' }}>{title}</div>
      <p style={{ margin: '8px 0 0', fontSize: '14px', lineHeight: 1.5, color: 'var(--soft)' }}>{text}</p>
    </div>
  );
}
