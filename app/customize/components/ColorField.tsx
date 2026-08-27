"use client";

export default function ColorField({
  label,
  value,
  effective,
  placeholder,
  onChange,
  marginTop,
}: {
  label: string;
  value: string;
  effective: string;
  placeholder: string;
  onChange: (value: string) => void;
  marginTop?: string;
}) {
  return (
    <div style={{ marginTop: marginTop ?? "14px" }}>
      <div className="ui" style={{ fontSize: "11px", letterSpacing: ".08em", color: "var(--soft)", textTransform: "uppercase", fontWeight: 600, marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          aria-hidden="true"
          style={{
            width: "38px",
            height: "38px",
            flex: "none",
            borderRadius: "11px",
            border: "1px solid var(--line)",
            background: effective,
            transition: "background .2s",
          }}
        />
        <input
          className="sf-input mono"
          value={value}
          onInput={(e) => onChange((e.target as HTMLInputElement).value)}
          onChange={() => {}}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          maxLength={8}
          aria-label={label}
          style={{ flex: 1, minWidth: 0, padding: "12px 14px", border: "1px solid var(--line)", borderRadius: "11px", background: "var(--surface2)", fontSize: "13.5px" }}
        />
      </div>
    </div>
  );
}
