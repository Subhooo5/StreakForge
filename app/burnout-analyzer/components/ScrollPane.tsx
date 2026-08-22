'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollPaneProps {
  children: React.ReactNode;
  /**
   * Hard cap past which content scrolls instead of growing the card. Omit
   * inside a stretched flex column, where the pane fills whatever height the
   * taller card in the pair established.
   */
  maxHeight?: number;
  className?: string;
}

/**
 * Contained vertical scroll for a card whose content can outgrow its pair.
 *
 * The paired cards are made equal-height by the grid itself (default `stretch`),
 * so this never sets a fixed height — a data-light repository leaves both cards
 * short and equal with no empty box, and only a repository whose content passes
 * `maxHeight` starts scrolling. The bottom fade appears solely while there is
 * more to reveal, so it never sits under content that has already ended.
 */
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
    // Content and the card's own height both change as data loads and as the
    // paired card grows, so watch the element rather than a single event.
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
