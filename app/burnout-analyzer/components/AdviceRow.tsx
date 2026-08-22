interface AdviceRowProps {
  text: string;
  ai: boolean;
}

export default function AdviceRow({ text, ai }: AdviceRowProps) {
  const accent = ai ? 'var(--accent-ink)' : 'var(--soft)';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '13px',
        padding: '15px 16px',
        borderRadius: '14px',
        background: 'var(--surface2)',
        border: `1px solid ${ai ? 'color-mix(in srgb,var(--accent) 26%,var(--line2))' : 'var(--line2)'}`,
      }}
    >
      <span
        style={{
          width: '26px',
          height: '26px',
          flex: 'none',
          borderRadius: '8px',
          display: 'grid',
          placeItems: 'center',
          background: `color-mix(in srgb,${accent} 15%,transparent)`,
          color: accent,
        }}
      >
        <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d={ai ? 'M8 1.6 9.4 6 14 7.4 9.4 8.8 8 13.4 6.6 8.8 2 7.4 6.6 6 8 1.6Z' : 'M3 8.5 6.5 12 13 4'} />
        </svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {ai && (
          <span
            className="ui"
            style={{
              display: 'inline-block',
              marginBottom: '6px',
              padding: '3px 8px',
              borderRadius: '7px',
              border: '1px solid color-mix(in srgb,var(--accent) 34%,var(--line))',
              background: 'color-mix(in srgb,var(--accent) 10%,transparent)',
              fontSize: '9.5px',
              letterSpacing: '.1em',
              fontWeight: 700,
              color: 'var(--accent-ink)',
              textTransform: 'uppercase',
            }}
          >
            AI generated
          </span>
        )}
        <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: 'var(--soft)' }}>{text}</p>
      </div>
    </div>
  );
}
