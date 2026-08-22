interface LoadingPanelProps {
  title: string;
  description: string;
  minHeight?: number;
}

export default function LoadingPanel({ title, description, minHeight = 255 }: LoadingPanelProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: '22px',
        padding: 'clamp(32px,6vw,64px)',
        minHeight: `${minHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        textAlign: 'center',
      }}
    >
      <svg width={30} height={30} viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" strokeWidth={1.6} style={{ animation: 'sf-spin 1s linear infinite' }}>
        <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" strokeLinecap="round" />
      </svg>
      <div className="ui" style={{ fontSize: '15px', fontWeight: 600 }}>{title}</div>
      <p className="ui" style={{ margin: 0, maxWidth: '420px', fontSize: '13px', lineHeight: 1.55, color: 'var(--soft)' }}>{description}</p>
    </div>
  );
}
