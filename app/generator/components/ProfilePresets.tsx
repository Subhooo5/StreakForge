'use client';

import { PROFILE_PRESETS, type ProfilePreset } from '../data/presets';

const SPARK = (
  <svg width={17} height={17} viewBox="0 0 16 16" fill="none" stroke="var(--accent-ink)" strokeWidth={1.5} strokeLinejoin="round">
    <path d="M6.2 1.6 7.4 4.9l3.3 1.2-3.3 1.2-1.2 3.3L5 7.3 1.7 6.1 5 4.9l1.2-3.3Z" />
    <path d="M12 8.6l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6Z" />
  </svg>
);

export default function ProfilePresets({ activeId, onPick }: { activeId: string | null; onPick: (preset: ProfilePreset) => void }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '18px', boxShadow: 'var(--shadow)', padding: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {SPARK}
          <span className="ui" style={{ fontSize: '12.5px', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700 }}>Profile Presets</span>
        </div>
        <span className="ui" style={{ fontSize: '12.5px', color: 'var(--soft)' }}>1-click template setup</span>
      </div>

      <div className="preset-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '18px' }}>
        {PROFILE_PRESETS.map((p) => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              aria-pressed={active}
              className="ui hov-card"
              style={{ display: 'block', textAlign: 'left', padding: '16px', border: `1px solid ${active ? 'var(--accent)' : 'var(--line2)'}`, borderRadius: '15px', background: active ? 'color-mix(in srgb,var(--accent) 8%,var(--surface2))' : 'var(--surface2)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontSize: '19px', lineHeight: 1 }} aria-hidden="true">{p.icon}</span>
                <span style={{ padding: '4px 10px', borderRadius: '100px', border: '1px solid color-mix(in srgb,var(--accent) 30%,var(--line))', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', color: 'var(--accent-ink)', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.badge}</span>
              </div>
              <div style={{ marginTop: '14px', fontSize: '15px', fontWeight: 700, letterSpacing: '-.01em' }}>{p.name}</div>
              <div style={{ marginTop: '5px', fontSize: '12.5px', color: 'var(--soft)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
