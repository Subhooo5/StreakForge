const CHEVRON = (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="m4 6 4 4 4-4" />
  </svg>
);

interface SelectFieldProps {
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
}

export default function SelectField({ value, onChange, children }: SelectFieldProps) {
  return (
    <div className="sf-field">
      <select className="sf-sel" value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
      {CHEVRON}
    </div>
  );
}
