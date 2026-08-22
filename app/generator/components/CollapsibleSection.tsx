'use client';

interface CollapsibleSectionProps {
  open: boolean;
  onToggle: () => void;
  title: string;
  titleExtra?: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  noBorderTopContent?: boolean;
  id?: string;
  count?: number;
  onReset?: () => void;
  maxHeightOpen?: string;
}

const CHEV = (
  <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M4 6l4 4 4-4" />
  </svg>
);

const RESET = (
  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <path d="M2.6 8a5.4 5.4 0 1 0 1.6-3.8" />
    <path d="M2.2 2.6v2.8h2.8" />
  </svg>
);

export default function CollapsibleSection({ open, onToggle, title, titleExtra, subtitle, children, noBorderTopContent, id, count, onReset, maxHeightOpen = '1200px' }: CollapsibleSectionProps) {
  return (
    <div id={id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '18px', boxShadow: 'var(--shadow)', overflow: 'hidden', scrollMarginTop: '110px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '22px 22px 18px' }}>
        <button onClick={onToggle} style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', textAlign: 'left' }}>
          <span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '17px', fontWeight: 600, letterSpacing: '-.01em' }}>
              {title}
              {titleExtra}
              {count ? (
                <span className="mono" style={{ display: 'inline-grid', placeItems: 'center', minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '100px', background: 'color-mix(in srgb,var(--accent) 16%,transparent)', color: 'var(--accent-ink)', fontSize: '11.5px', fontWeight: 700 }}>{count}</span>
              ) : null}
            </span>
            <span className="ui" style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: 'var(--soft)' }}>{subtitle}</span>
          </span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 'none', paddingTop: '2px' }}>
          {onReset && (
            <button onClick={onReset} aria-label={`Reset ${title}`} title={`Reset ${title}`} style={{ width: '28px', height: '28px', display: 'grid', placeItems: 'center', borderRadius: '9px', color: 'var(--faint)', transition: 'color .18s,background .18s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface2)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--faint)'; e.currentTarget.style.background = 'transparent'; }}>
              {RESET}
            </button>
          )}
          <button onClick={onToggle} aria-label={open ? `Collapse ${title}` : `Expand ${title}`} style={{ width: '28px', height: '28px', display: 'grid', placeItems: 'center', color: 'var(--soft)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .25s' }}>{CHEV}</button>
        </div>
      </div>
      <div className="collapse-body" style={{ maxHeight: open ? maxHeightOpen : '0px', opacity: open ? '1' : '0' }}>
        {noBorderTopContent ? children : (
          <div style={{ borderTop: '1px solid var(--line2)' }}>{children}</div>
        )}
      </div>
    </div>
  );
}
