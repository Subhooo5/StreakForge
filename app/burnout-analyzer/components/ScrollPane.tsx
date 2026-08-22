'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollPaneProps {
  children: React.ReactNode;
  maxHeight?: number;
  className?: string;
}

export default function ScrollPane({ children, maxHeight, className }: ScrollPaneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const canScroll = el.scrollHeight - el.clientHeight > 1;
    setOverflowing(canScroll);
    setAtBottom(canScroll && el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure, children]);

  const showFade = overflowing && !atBottom;

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        ref={ref}
        onScroll={measure}
        className={['sf-pane', className].filter(Boolean).join(' ')}
        style={{
          flex: 1,
          minHeight: 0,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: '6px',
          bottom: 0,
          height: '46px',
          pointerEvents: 'none',
          background: 'linear-gradient(to bottom,transparent,var(--surface))',
          opacity: showFade ? 1 : 0,
          transition: 'opacity .2s ease',
        }}
      />
    </div>
  );
}
