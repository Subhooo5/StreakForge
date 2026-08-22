'use client';

interface SelectableRowProps {
  iconEl: React.ReactNode;
  name: string;
  cat: string;
  selected: boolean;
  onToggle: () => void;
}

const CHECK = (
  <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={2.4}>
    <path d="M3 8.5 6.5 12 13 4" />
  </svg>
);

export default function SelectableRow({ iconEl, name, cat, selected, onToggle }: SelectableRowProps) {
  return (
    <button onClick={onToggle} className="ui" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', border: `1px solid ${selected ? 'var(--accent)' : 'var(--line2)'}`, borderRadius: '12px', background: selected ? 'color-mix(in srgb,var(--accent) 8%,transparent)' : 'var(--surface2)', textAlign: 'left', transition: 'border-color .15s', width: '100%' }}>
      <span style={{ width: '32px', height: '32px', flex: 'none', display: 'grid', placeItems: 'center' }}>{iconEl}</span>
      <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>{name}</span>
      <span style={{ fontSize: '11px', color: 'var(--faint)' }}>{cat}</span>
      <span style={{ width: '18px', height: '18px', flex: 'none', borderRadius: '50%', border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--line)'}`, background: selected ? 'var(--accent)' : 'transparent', display: 'grid', placeItems: 'center' }}>
        {selected ? CHECK : null}
      </span>
    </button>
  );
}
