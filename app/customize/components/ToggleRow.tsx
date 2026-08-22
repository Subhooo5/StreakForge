interface ToggleRowProps {
  label: string;
  checked: boolean;
  onClick: () => void;
}

const CHECK = (
  <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={2.2}>
    <path d="M3 8.5 6.5 12 13 4" />
  </svg>
);

export default function ToggleRow({ label, checked, onClick }: ToggleRowProps) {
  const boxBorder = checked ? 'var(--accent)' : 'var(--line)';
  const boxBg = checked ? 'var(--accent)' : 'transparent';
  return (
    <button
      onClick={onClick}
      className="ui hov-row"
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--line2)', borderRadius: '11px', background: 'var(--surface2)', textAlign: 'left', width: '100%' }}
    >
      <span style={{ width: '20px', height: '20px', flex: 'none', borderRadius: '6px', border: `1.5px solid ${boxBorder}`, background: boxBg, display: 'grid', placeItems: 'center', color: '#fff' }}>
        {checked ? CHECK : null}
      </span>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>
    </button>
  );
}
