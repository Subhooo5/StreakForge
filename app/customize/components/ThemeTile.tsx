"use client";

import ThemeIcon from "./ThemeIcon";
import type { ThemePreset } from "../data/themes";

export default function ThemeTile({
  preset,
  selected,
  onClick,
}: {
  preset: ThemePreset;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={preset.label}
      aria-label={preset.label}
      aria-pressed={selected}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: "12px",
        border: "1px solid var(--line)",
        background: preset.bg,
        color: preset.accent,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        boxShadow: selected ? "0 0 0 2px var(--accent),0 10px 22px -12px var(--accent)" : "none",
        transform: selected ? "translateY(-1px)" : "none",
        transition: "transform .16s ease,box-shadow .16s ease",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.transform = "";
      }}
    >
      <ThemeIcon name={preset.icon} size={18} />
      {selected && (
        <span
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            width: "15px",
            height: "15px",
            borderRadius: "50%",
            background: "var(--accent)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 2px 6px -2px rgba(0,0,0,.5)",
          }}
        >
          <svg width={9} height={9} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5 6.5 11.5 12.5 5" />
          </svg>
        </span>
      )}
    </button>
  );
}
