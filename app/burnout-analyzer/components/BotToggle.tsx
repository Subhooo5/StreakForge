import Icon from './Icon';

interface BotToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  /** Rendered when the analysis knows how many bot accounts it found. */
  filteredCount?: number;
  disabled?: boolean;
  id: string;
}

/**
 * Switch for excluding automated bot and dependency accounts.
 *
 * Both instances on the page — the one above the search box and the one over
 * the results — drive the same state and the same re-analysis, because the
 * filter changes the commit totals every figure is derived from rather than
 * merely hiding rows.
 */
export default function BotToggle({ checked, onChange, label, hint, filteredCount, disabled, id }: BotToggleProps) {
  return (
    <label
      htmlFor={id}
      className="ui"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '14px',
        border: `1px solid ${checked ? 'color-mix(in srgb,var(--accent) 38%,var(--line))' : 'var(--line)'}`,
        background: checked ? 'color-mix(in srgb,var(--accent) 7%,var(--surface2))' : 'var(--surface2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color .2s ease,background .2s ease',
      }}
    >
      <span
        style={{
          width: '30px',
          height: '30px',
          flex: 'none',
          borderRadius: '9px',
          display: 'grid',
          placeItems: 'center',
          background: `color-mix(in srgb,${checked ? 'var(--accent)' : 'var(--faint)'} 16%,transparent)`,
          color: checked ? 'var(--accent-ink)' : 'var(--faint)',
          transition: 'color .2s ease,background .2s ease',
        }}
      >
        <Icon name="bot" size={16} />
      </span>

      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 600 }}>{label}</span>
        {hint && (
          <span style={{ display: 'block', marginTop: '3px', fontSize: '11.5px', lineHeight: 1.4, color: 'var(--soft)' }}>
            {hint}
            {typeof filteredCount === 'number' && filteredCount > 0 && (
              <>
                {' '}
                <span className="mono" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>
                  {filteredCount}
                </span>{' '}
                found in this repository.
              </>
            )}
          </span>
        )}
      </span>

      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
      />

      <span
        aria-hidden="true"
        style={{
          width: '42px',
          height: '24px',
          flex: 'none',
          borderRadius: '100px',
          padding: '3px',
          background: checked ? 'var(--accent)' : 'color-mix(in srgb,var(--faint) 30%,transparent)',
          boxShadow: checked ? '0 6px 16px -8px var(--accent)' : 'none',
          transition: 'background .2s ease,box-shadow .2s ease',
        }}
      >
        <span
          style={{
            display: 'block',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#fff',
            transform: checked ? 'translateX(18px)' : 'translateX(0)',
            transition: 'transform .2s cubic-bezier(.2,.8,.2,1)',
          }}
        />
      </span>
    </label>
  );
}
