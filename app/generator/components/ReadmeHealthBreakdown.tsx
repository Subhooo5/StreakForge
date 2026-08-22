'use client';

import { Hover } from './ui';
import { computeHealth, topInsight } from '../utils/score';
import type { GeneratorState } from '../types';

const PULSE = (
  <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="var(--info)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 8h2.6L5.4 3.4 8.2 12.6 10 8h5" />
  </svg>
);

const DONE = (
  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="var(--good)" strokeWidth={1.7} style={{ flex: 'none' }}>
    <circle cx={8} cy={8} r={6.4} />
    <path d="M5.3 8 7 9.7 10.8 6" />
  </svg>
);

const TODO = (
  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth={1.5} style={{ flex: 'none' }}>
    <circle cx={8} cy={8} r={6.4} />
  </svg>
);

const BULB = (
  <svg width={17} height={17} viewBox="0 0 16 16" fill="none" stroke="var(--accent-2)" strokeWidth={1.5}>
    <path d="M8 1.5a4.5 4.5 0 0 0-2.5 8.3V12h5v-2.2A4.5 4.5 0 0 0 8 1.5ZM6 14h4" />
  </svg>
);

/**
 * Pass/fail view of the README plus one-tap jumps to whatever is missing.
 * Every value is derived from `state` on each render, so it tracks the form
 * exactly — nothing here is cached or debounced.
 */
export default function ReadmeHealthBreakdown({ state, onJump }: { state: GeneratorState; onJump: (sectionId: string) => void }) {
  const { items, percentage, missing } = computeHealth(state);
  const insight = topInsight(state);

  const barColor = percentage >= 80 ? 'var(--good)' : percentage >= 50 ? 'var(--warn)' : 'var(--bad)';

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '18px', boxShadow: 'var(--shadow)', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 600, letterSpacing: '-.01em' }}>
          {PULSE}README Health Breakdown
        </div>
        <span className="mono" style={{ fontSize: '15px', fontWeight: 700, color: barColor }}>{percentage}%</span>
      </div>

      <div style={{ marginTop: '16px', height: '9px', borderRadius: '6px', background: 'var(--line)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '6px', background: barColor, width: percentage + '%', transition: 'width .35s cubic-bezier(.2,.8,.2,1),background .3s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
        {items.map((it) => (
          <div key={it.key} className="ui" style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '13.5px', color: it.completed ? 'var(--text)' : 'var(--faint)' }}>
            {it.completed ? DONE : TODO}
            {it.label}
          </div>
        ))}
      </div>

      {missing.length > 0 && (
        <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--line2)' }}>
          <div className="ui" style={{ fontSize: '11px', letterSpacing: '.08em', color: 'var(--faint)', textTransform: 'uppercase', fontWeight: 700 }}>Quick Fixes</div>
          <div className="ui" style={{ display: 'flex', flexWrap: 'wrap', gap: '9px', marginTop: '14px' }}>
            {missing.map((it) => (
              <Hover
                key={it.key}
                as="button"
                onClick={() => onJump(it.sectionId)}
                base={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '100px', border: '1px solid color-mix(in srgb,var(--info) 35%,var(--line))', background: 'color-mix(in srgb,var(--info) 10%,transparent)', color: 'var(--info)', fontSize: '12.5px', fontWeight: 600, transition: 'transform .15s,background .15s' }}
                hover={{ transform: 'translateY(-1px)', background: 'color-mix(in srgb,var(--info) 18%,transparent)' }}
              >
                <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M8 3v10M3 8h10" /></svg>
                Add {it.label}
              </Hover>
            ))}
          </div>
        </div>
      )}

      {insight && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--line2)' }}>
          <span style={{ display: 'flex' }}>{BULB}</span>
          <span className="ui" style={{ fontSize: '13.5px', color: 'var(--soft)' }}>{insight.text}</span>
          <span className="ui" style={{ marginLeft: 'auto', padding: '5px 11px', borderRadius: '100px', background: 'color-mix(in srgb,var(--good) 14%,transparent)', color: 'var(--good)', fontSize: '11.5px', fontWeight: 700 }}>Health boost +{insight.boost}%</span>
        </div>
      )}
    </div>
  );
}
