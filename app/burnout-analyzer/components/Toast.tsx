'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastState {
  message: string;
  tone: 'ok' | 'bad';
  /** Bumped per call so repeat messages still restart the timer. */
  nonce: number;
}

/** Fire-and-forget toast state, auto-dismissing after `ms`. */
export function useToast(ms = 2600): [ToastState | null, (message: string, tone?: 'ok' | 'bad') => void] {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nonce = useRef(0);

  const show = useCallback(
    (message: string, tone: 'ok' | 'bad' = 'ok') => {
      nonce.current += 1;
      setToast({ message, tone, nonce: nonce.current });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), ms);
    },
    [ms],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return [toast, show];
}

/**
 * Fixed-position confirmation for export actions.
 *
 * Fixed rather than in-flow so surfacing one never moves the page — the same
 * rule the rest of this page follows.
 */
export default function Toast({ toast }: { toast: ToastState | null }) {
  const accent = toast?.tone === 'bad' ? 'var(--bad)' : 'var(--good)';
  return (
    <div
      role="status"
      aria-live="polite"
      className="ui"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '28px',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 18px',
        borderRadius: '13px',
        border: `1px solid color-mix(in srgb,${accent} 38%,var(--line))`,
        background: 'var(--surface2)',
        backdropFilter: 'blur(14px)',
        boxShadow: 'var(--shadow)',
        fontSize: '13.5px',
        fontWeight: 500,
        color: 'var(--text)',
        pointerEvents: 'none',
        opacity: toast ? 1 : 0,
        transform: `translateX(-50%) translateY(${toast ? '0' : '10px'})`,
        transition: 'opacity .22s ease,transform .22s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <span style={{ width: '18px', height: '18px', flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center', background: `color-mix(in srgb,${accent} 18%,transparent)`, color: accent }}>
        <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d={toast?.tone === 'bad' ? 'M4 4l8 8M12 4l-8 8' : 'M3 8.5 6.5 12 13 4'} />
        </svg>
      </span>
      {toast?.message ?? ''}
    </div>
  );
}
