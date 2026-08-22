'use client';

import { useEffect, useRef, useState } from 'react';
import { fallbackCopyToClipboard } from '@/utils/clipboard';

// Shared building blocks for the Generator page's controls. Everything here
// draws only on the design-system tokens in `app/globals.css` — no new colours,
// no Tailwind utilities.

// Reproduces the mockup's `style-hover="..."` behaviour with React hover state.
// `base` styles stay verbatim; `hover` styles are merged on pointer-enter.
type HoverProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  base?: React.CSSProperties;
  hover?: React.CSSProperties;
  href?: string;
  target?: string;
  rel?: string;
  title?: string;
  'aria-label'?: string;
};

export function Hover({ as = 'div', base, hover, children, ...rest }: HoverProps) {
  const [h, setH] = useState(false);
  const Tag = as as React.ElementType;
  return (
    <Tag {...rest} style={{ ...base, ...(h ? hover : undefined) }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      {children}
    </Tag>
  );
}

/** Small caps field label used above every input in the builder. */
export function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="ui" style={{ fontSize: '11px', letterSpacing: '.1em', color: 'var(--soft)', textTransform: 'uppercase', fontWeight: 600, ...style }}>
      {children}
    </div>
  );
}

/** The pill switch used by every "include in README" row. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{ width: '48px', height: '28px', flex: 'none', borderRadius: '100px', background: on ? 'var(--accent)' : 'var(--line)', position: 'relative', transition: 'background .2s' }}>
      <span style={{ position: 'absolute', top: '3px', left: on ? '23px' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .2s' }} />
    </button>
  );
}

/** Title + description on the left, switch on the right. */
export function ToggleRow({ title, description, on, onChange, label }: { title: string; description: string; on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
      <div>
        <div className="ui" style={{ fontSize: '13.5px', fontWeight: 600 }}>{title}</div>
        <div className="ui" style={{ marginTop: '3px', fontSize: '12px', color: 'var(--soft)', lineHeight: 1.45 }}>{description}</div>
      </div>
      <Toggle on={on} onChange={onChange} label={label} />
    </div>
  );
}

export const SEARCH_ICON = (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.5}>
    <circle cx={7} cy={7} r={4.5} />
    <path d="m11 11 3 3" strokeLinecap="round" />
  </svg>
);

const CLEAR_ICON = (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

/** Search-prefixed text input with an optional clear affordance. */
export function SearchInput({ value, onChange, placeholder, maxLength, onClear, spinner, id }: { value: string; onChange: (v: string) => void; placeholder: string; maxLength?: number; onClear?: () => void; spinner?: boolean; id?: string }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: '14px', display: 'flex', pointerEvents: 'none' }}>{SEARCH_ICON}</span>
      <input
        id={id}
        className="sf-input ui"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        spellCheck={false}
        style={{ width: '100%', fontSize: '14px', padding: '13px 38px 13px 40px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface2)' }}
      />
      <span style={{ position: 'absolute', right: '13px', display: 'flex', alignItems: 'center' }}>
        {spinner ? <Spinner /> : onClear && value.length > 0 ? (
          <button type="button" onClick={onClear} aria-label="Clear" style={{ display: 'flex', color: 'var(--faint)', transition: 'color .18s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--faint)'; }}>
            {CLEAR_ICON}
          </button>
        ) : null}
      </span>
    </div>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ animation: 'sf-spin 0.9s linear infinite', color: 'var(--soft)' }}>
      <path d="M8 1.6a6.4 6.4 0 1 0 6.4 6.4" strokeLinecap="round" />
    </svg>
  );
}

/** Equal-width segmented control (icon-style picker, placement picker, tabs). */
export function Segmented<T extends string>({ options, value, onChange, uppercase }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; uppercase?: boolean }) {
  return (
    <div className="ui" style={{ display: 'flex', gap: '4px', padding: '5px', border: '1px solid var(--line)', borderRadius: '13px', background: 'var(--surface2)' }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{ flex: 1, padding: '11px', borderRadius: '9px', fontSize: '13px', fontWeight: 600, letterSpacing: uppercase ? '.08em' : undefined, textTransform: uppercase ? 'uppercase' : undefined, background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text)' : 'var(--soft)', boxShadow: active ? '0 1px 2px rgba(0,0,0,.08)' : undefined, transition: 'all .15s' }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const COPY_ICON = (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <rect x={5} y={5} width={8} height={8} rx={1.6} />
    <path d="M3 11V4a1 1 0 0 1 1-1h7" />
  </svg>
);

const CHECK_ICON = (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 8.5 6.5 12 13 4" />
  </svg>
);

/** Copies `text`, flashing a tick for ~1.6s. Falls back to execCommand. */
export function CopyButton({ text, label = 'Copy', floating }: { text: string; label?: string; floating?: boolean }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = fallbackCopyToClipboard(text);
    }
    if (!ok) return;
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1600);
  };

  const base: React.CSSProperties = floating
    ? { position: 'absolute', top: '10px', right: '10px', display: 'grid', placeItems: 'center', width: '28px', height: '28px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', color: done ? 'var(--good)' : '#cdd6e6', transition: 'background .18s,color .18s', zIndex: 2 }
    : { display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 14px', borderRadius: '11px', border: '1px solid var(--line)', background: 'var(--surface2)', fontSize: '12.5px', fontWeight: 600, color: done ? 'var(--good)' : 'var(--soft)', transition: 'border-color .18s,color .18s' };

  return (
    <Hover as="button" onClick={copy} title={label} aria-label={label} base={base} hover={floating ? { background: 'rgba(255,255,255,.14)' } : { border: '1px solid var(--accent)', color: done ? 'var(--good)' : 'var(--text)' }}>
      {done ? CHECK_ICON : COPY_ICON}
      {!floating && <span>{done ? 'Copied!' : label}</span>}
    </Hover>
  );
}

/** Dark scrollable code panel with a floating copy button. */
export function CodeBlock({ code, maxHeight = '220px' }: { code: string; maxHeight?: string }) {
  return (
    <div style={{ position: 'relative', border: '1px solid var(--line2)', borderRadius: '14px', overflow: 'hidden', background: '#0c0e16' }}>
      <CopyButton text={code} label="Copy to clipboard" floating />
      <pre className="mono" style={{ margin: 0, padding: '16px 46px 16px 16px', fontSize: '11.5px', lineHeight: 1.65, color: '#cdd6e6', whiteSpace: 'pre', overflow: 'auto', maxHeight }}>{code}</pre>
    </div>
  );
}

/** One-line status message under an input (verifying / found / error). */
export function StatusLine({ tone, children }: { tone: 'good' | 'warn' | 'bad' | 'soft'; children: React.ReactNode }) {
  const color = tone === 'good' ? 'var(--good)' : tone === 'warn' ? 'var(--warn)' : tone === 'bad' ? 'var(--bad)' : 'var(--soft)';
  return (
    <div className="ui" style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '9px', fontSize: '12.5px', color, lineHeight: 1.45 }}>
      {children}
    </div>
  );
}

export const WARN_TRI = (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" style={{ flex: 'none' }}>
    <path d="M8 2.2 15 13.6H1L8 2.2Z" />
    <path d="M8 6.4v3M8 11.5h.01" strokeLinecap="round" />
  </svg>
);

export const CHECK_CIRCLE = (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} style={{ flex: 'none' }}>
    <circle cx={8} cy={8} r={6.4} />
    <path d="M5.3 8 7 9.7 10.8 6" />
  </svg>
);

export const EXTERNAL = (
  <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" style={{ flex: 'none' }}>
    <path d="M6.4 3.2H3.2v9.6h9.6V9.6M9.6 3.2h3.2v3.2M12.8 3.2 7.2 8.8" />
  </svg>
);

/** Small "Full dashboard ↗" / "View repository ↗" link. */
export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Hover as="a" href={href} target="_blank" rel="noopener" base={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--accent-ink)', transition: 'opacity .18s' }} hover={{ opacity: 0.75 }}>
      {children}
      {EXTERNAL}
    </Hover>
  );
}

/** Dark stage panel every live preview sits on, matching the README preview. */
export function PreviewStage({ children, minHeight = '140px', style }: { children: React.ReactNode; minHeight?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', border: '1px solid var(--line2)', borderRadius: '14px', background: '#0c0e16', minHeight, overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}
