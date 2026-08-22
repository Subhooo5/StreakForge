'use client';

import { useEffect, useRef, useState } from 'react';

export type ExportAction = 'json' | 'markdown' | 'share' | 'summary' | 'pdf';

interface ExportMenuProps {
  onAction: (action: ExportAction) => void;
  disabled?: boolean;
  /** Action currently running, so its row can show progress. */
  busy?: ExportAction | null;
}

const ITEMS: { key: ExportAction; label: string; icon: React.ReactNode; tint: string }[] = [
  {
    key: 'json',
    label: 'Download as JSON',
    tint: 'var(--accent-ink)',
    icon: <path d="M4 2h5l3 3v9H4zM9 2v3h3M6.4 9.4 5.2 10.6l1.2 1.2M9.6 9.4l1.2 1.2-1.2 1.2" />,
  },
  {
    key: 'markdown',
    label: 'Export as Markdown',
    tint: 'var(--info,var(--accent-ink))',
    icon: <path d="M4 2h5l3 3v9H4zM9 2v3h3M6 8v3.5M6 8l1.4 1.6L8.8 8v3.5" />,
  },
  {
    key: 'share',
    label: 'Copy Share Link',
    tint: 'var(--accent-2)',
    icon: <path d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 1 0-3.7-3.7l-.9.9M9.4 6.6a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 1 0 3.7 3.7l.9-.9" />,
  },
  {
    key: 'summary',
    label: 'Copy Markdown Summary',
    tint: 'var(--warn)',
    icon: <path d="M5.5 2h5l2.5 2.5V11h-7.5zM3 5v9h7M8 6.5h3M8 8.5h3" />,
  },
  {
    key: 'pdf',
    label: 'Download as PDF',
    tint: 'var(--bad)',
    icon: <path d="M4 2h5l3 3v9H4zM9 2v3h3M6 8.5h1.4a.9.9 0 0 1 0 1.8H6zm0 0V12" />,
  },
];

/**
 * The Download Report menu.
 *
 * Rendered in a `position: relative` wrapper with the panel absolutely
 * positioned, so opening it never displaces anything around it — consistent
 * with the page's rule that no state change moves an unrelated section.
 */
export default function ExportMenu({ onAction, disabled, busy }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<ExportAction | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // `capture` so the page's own window click handler (the canvas ripple)
    // cannot swallow the outside-click before it reaches us.
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '9px',
          padding: '12px 20px',
          borderRadius: '12px',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: '0 8px 22px -10px var(--accent)',
          transition: 'transform .16s',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transform: open ? 'translateY(-1px)' : 'none',
        }}
      >
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.6}>
          <path d="M8 2v8M5 7l3 3 3-3M3 13h10" />
        </svg>
        Download Report
        <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={1.9} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <path d="M4 6.5 8 10.5l4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        role="menu"
        style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          zIndex: 60,
          minWidth: '264px',
          padding: '8px',
          borderRadius: '16px',
          border: '1px solid var(--line)',
          background: 'var(--surface2)',
          backdropFilter: 'blur(18px)',
          boxShadow: 'var(--shadow)',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-6px)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .18s ease,transform .18s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {ITEMS.map((item) => {
          const active = hover === item.key;
          const running = busy === item.key;
          return (
            <button
              key={item.key}
              role="menuitem"
              disabled={!!busy}
              onClick={() => {
                setOpen(false);
                onAction(item.key);
              }}
              onMouseEnter={() => setHover(item.key)}
              onMouseLeave={() => setHover(null)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 12px',
                borderRadius: '11px',
                background: active ? 'color-mix(in srgb,var(--accent) 9%,transparent)' : 'transparent',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: 500,
                textAlign: 'left',
                cursor: busy ? 'wait' : 'pointer',
                transition: 'background .15s ease',
              }}
            >
              <span style={{ width: '26px', height: '26px', flex: 'none', borderRadius: '8px', display: 'grid', placeItems: 'center', background: `color-mix(in srgb,${item.tint} 15%,transparent)`, color: item.tint }}>
                {running ? (
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} style={{ animation: 'sf-spin 1s linear infinite' }}>
                    <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                    {item.icon}
                  </svg>
                )}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
