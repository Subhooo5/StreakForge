interface LoadingPanelProps {
  /** What is being loaded, e.g. "Analysing vercel/next.js". */
  title: string;
  /** One line on what is actually being fetched. */
  description: string;
  /**
   * Reserves the panel's height so the surrounding layout does not move when
   * the panel is replaced by loaded content. Defaults to the burnout page's
   * original panel height.
   */
  minHeight?: number;
}

/**
 * The shared "we are fetching this" panel.
 *
 * Extracted from the Burnout Radar page so Compare and the dashboard tabs use
 * the same spinner, container sizing and typography rather than each inventing
 * their own. `minHeight` is part of the contract: a loading state that reserves
 * its own height is what keeps a page from jumping when data lands.
 */
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
