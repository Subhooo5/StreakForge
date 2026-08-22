"use client";

/**
 * Concept icons for the Theme Preset grid.
 *
 * One coherent visual language across the whole grid: every glyph is drawn on
 * the same 24×24 canvas as round-capped 1.6px strokes in `currentColor`, with
 * no fills and no mixed illustration styles — so 33 different palettes still
 * read as one set. Each glyph illustrates its theme's name or concept (moon
 * for Dark, sun for Light, pine for Forest, …), and the light variants of a
 * theme reuse their dark sibling's glyph plus a small sun mark, so the pairs
 * (Nord / Nord Light, Gruvbox / Gruvbox Light) stay recognisably related.
 */

export type ThemeIconName =
  | "spark"
  | "moon"
  | "sun"
  | "bolt"
  | "brackets"
  | "bat"
  | "waves"
  | "sunHorizon"
  | "pine"
  | "flower"
  | "snowflake"
  | "retroSun"
  | "box"
  | "aurora"
  | "contrast"
  | "coffee"
  | "solar"
  | "boxLight"
  | "snowLight"
  | "gem"
  | "pulse"
  | "terminal"
  | "iceberg"
  | "bulb"
  | "skylineNight"
  | "chip"
  | "chipNeon"
  | "skyline"
  | "palette"
  | "moonWaves"
  | "tower"
  | "chakra"
  | "dune";

/** Path data per glyph — `d` strings only, so every icon shares one <svg>. */
const GLYPHS: Record<ThemeIconName, string[]> = {
  spark: ["M12 3.2 13.7 10.3 20.8 12 13.7 13.7 12 20.8 10.3 13.7 3.2 12 10.3 10.3Z"],
  moon: ["M19.4 14.8A8.2 8.2 0 1 1 9.2 4.6a6.6 6.6 0 0 0 10.2 10.2Z"],
  sun: [
    "M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Z",
    "M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6",
  ],
  bolt: ["M13.4 2.8 5.6 13.6h5.2l-1 7.6 8.6-11h-5.2l.2-7.4Z"],
  brackets: ["M9.2 6.6 4.4 12l4.8 5.4M14.8 6.6 19.6 12l-4.8 5.4"],
  bat: [
    "M12 9.4 9.6 7.2v2.6C8 8.6 6.4 8.4 4.6 9.2c.6 1 .5 2 .2 3 1.6-.4 2.6.2 3.4 1.6L12 16.4l3.8-2.6c.8-1.4 1.8-2 3.4-1.6-.3-1-.4-2 .2-3-1.8-.8-3.4-.6-5 .6V7.2L12 9.4Z",
  ],
  waves: [
    "M3.2 9.2c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.4 0",
    "M3.2 14.6c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.4 0",
  ],
  sunHorizon: [
    "M3.4 18.2h17.2",
    "M7.6 18.2a4.4 4.4 0 0 1 8.8 0",
    "M12 4.6v2.4M5.6 7.6l1.7 1.7M18.4 7.6l-1.7 1.7",
  ],
  pine: ["M12 3.2 8 9.4h8L12 3.2Z", "M12 8 6.6 16.4h10.8L12 8Z", "M12 16.4v4.4"],
  flower: [
    "M12 10.4a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z",
    "M12 10.4c-1.6-2.4-.8-4.6 0-5.4.8.8 1.6 3 0 5.4ZM13.6 12.2c2.4-1.6 4.6-.8 5.4 0-.8.8-3 1.6-5.4 0ZM10.4 12.2c-2.4-1.6-4.6-.8-5.4 0 .8.8 3 1.6 5.4 0Z",
    "M12 14v6.6",
  ],
  snowflake: [
    "M12 3.4v17.2M4.6 7.8l14.8 8.4M19.4 7.8 4.6 16.2",
    "M12 6.8 9.8 5M12 6.8 14.2 5M12 17.2l-2.2 1.8M12 17.2l2.2 1.8",
  ],
  retroSun: [
    "M12 5.2a6 6 0 0 1 6 6H6a6 6 0 0 1 6-6Z",
    "M6.6 8.6h10.8M7.4 10.4h9.2",
    "M3.4 14.6h17.2M5 17.4h14M6.6 20.2h10.8",
  ],
  box: [
    "M12 3.4 20 7.6v8.8L12 20.6 4 16.4V7.6L12 3.4Z",
    "M4 7.6 12 12l8-4.4M12 12v8.6",
  ],
  aurora: [
    "M3.4 15.6c2.8-6.4 6.4-9.6 10.8-9.6 2.4 0 4.4.8 6.4 2.4",
    "M5.8 19c2.4-4.8 5.4-7.2 9-7.2 1.8 0 3.4.5 4.8 1.6",
    "M17.4 4.2v2.4M16.2 5.4h2.4",
  ],
  contrast: [
    "M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8Z",
    "M12 3.6v16.8M12 6.4h5M12 9.6h6.6M12 12.8h6.6M12 16h5",
  ],
  coffee: [
    "M4.6 9.6h12.2v4.6a4.6 4.6 0 0 1-4.6 4.6H9.2a4.6 4.6 0 0 1-4.6-4.6V9.6Z",
    "M16.8 11h1.6a2.2 2.2 0 0 1 0 4.4h-1.6",
    "M8.4 3.6v2.6M12 3.6v2.6",
  ],
  solar: [
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    "M12 3.4v1.8M12 18.8v1.8M3.4 12h1.8M18.8 12h1.8M6 6l1.3 1.3M16.7 16.7 18 18M18 6l-1.3 1.3M7.3 16.7 6 18",
  ],
  boxLight: [
    "M11 6.4 18 10v7.6L11 21.2 4 17.6V10l7-3.6Z",
    "M4 10l7 3.8L18 10M11 13.8v7.4",
    "M17.4 3.2v3M15.9 4.7h3",
  ],
  snowLight: [
    "M10.6 6v13.6M4.6 9.4l12 6.8M16.6 9.4l-12 6.8",
    "M10.6 8.8 9 7.4M10.6 8.8l1.6-1.4",
    "M18.4 3.4v3M16.9 4.9h3",
  ],
  gem: [
    "M12 3.4 20 9.2l-8 11.4L4 9.2l8-5.8Z",
    "M4 9.2h16M9.2 9.2 12 20.6l2.8-11.4M9.2 9.2 12 3.4l2.8 5.8",
  ],
  pulse: [
    "M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8Z",
    "M5.4 12h2.8l1.6-3.6 2.4 7.2 1.6-3.6h4.8",
  ],
  terminal: [
    "M3.6 5.2h16.8v13.6H3.6V5.2Z",
    "M3.6 8.6h16.8",
    "M6.6 12l2.4 2.2-2.4 2.2M11.6 16.4h5",
  ],
  iceberg: [
    "M12 3.4 17.6 12H6.4L12 3.4Z",
    "M3.4 12h17.2",
    "M4.8 15c1.6-1.8 3.2-1.8 4.8 0s3.2 1.8 4.8 0 3.2-1.8 4.8 0M4.8 18.6c1.6-1.8 3.2-1.8 4.8 0s3.2 1.8 4.8 0 3.2-1.8 4.8 0",
  ],
  bulb: [
    "M12 3.6a5.6 5.6 0 0 0-3.4 10.1c.6.5 1 1.2 1 2v.7h4.8v-.7c0-.8.4-1.5 1-2A5.6 5.6 0 0 0 12 3.6Z",
    "M9.8 19.2h4.4M10.6 21.2h2.8",
  ],
  skylineNight: [
    "M3.4 20.2h17.2",
    "M5 20.2v-7h4v7M11 20.2V9.4h4.4v10.8M17.4 20.2v-5.4h2.2",
    "M18.6 7.6a2.8 2.8 0 1 1-2.6-3.6 2.2 2.2 0 0 0 2.6 3.6Z",
  ],
  chip: [
    "M7.4 7.4h9.2v9.2H7.4V7.4Z",
    "M10.4 10.4h3.2v3.2h-3.2z",
    "M10 7.4V4.4M14 7.4V4.4M10 19.6v-3M14 19.6v-3M7.4 10H4.4M7.4 14H4.4M19.6 10h-3M19.6 14h-3",
  ],
  chipNeon: [
    "M7.4 7.4h9.2v9.2H7.4V7.4Z",
    "M11.2 11.2h1.6v1.6h-1.6z",
    "M10 7.4V4.4M14 7.4V4.4M10 19.6v-3M14 19.6v-3M7.4 10H4.4M7.4 14H4.4M19.6 10h-3M19.6 14h-3",
    "M3.6 3.6 6 6M20.4 3.6 18 6M3.6 20.4 6 18M20.4 20.4 18 18",
  ],
  skyline: [
    "M3.4 20.2h17.2",
    "M5 20.2v-8.6h4.4v8.6M11.4 20.2V7.4h4.2v12.8M17.6 20.2v-6h2.2",
    "M6.6 4.6v1.8M5.7 5.5h1.8M18.4 8.2v1.8M17.5 9.1h1.8",
  ],
  palette: [
    "M12 3.6c-4.6 0-8.4 3.5-8.4 7.9 0 4.3 3.4 6.9 6.4 6.9 1.5 0 2.1-.8 2.1-1.7 0-1.4-1.3-1.6-1.3-2.9 0-1 .8-1.8 2-1.8h1.9c3 0 5.7-1.7 5.7-4.5 0-2.4-3.3-3.9-8.4-3.9Z",
    "M7.4 10.6h.01M10.4 7.8h.01M14.2 7.8h.01M17.2 10.4h.01",
  ],
  moonWaves: [
    "M17.6 9.6A5.6 5.6 0 1 1 11.2 3a4.4 4.4 0 0 0 6.4 6.6Z",
    "M3.4 15c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.4 0M3.4 19.2c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.4 0",
  ],
  tower: [
    "M6.6 20.4V4.6h10.8v15.8",
    "M3.6 20.4h16.8",
    "M9.4 8h1.6M13 8h1.6M9.4 11.6h1.6M13 11.6h1.6M9.4 15.2h1.6M13 15.2h1.6",
  ],
  chakra: [
    "M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8Z",
    "M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z",
    "M12 3.6v4.8M12 15.6v4.8M3.6 12h4.8M15.6 12h4.8M6 6l3.4 3.4M14.6 14.6 18 18M18 6l-3.4 3.4M9.4 14.6 6 18",
  ],
  dune: [
    "M3.4 17.4c3-4.4 5.4-4.4 8 0",
    "M9.6 20.4c3.4-5 6.6-5 11 0",
    "M15.6 5.2a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z",
  ],
};

/**
 * @param name which glyph to draw
 * @param size rendered px (square)
 */
export default function ThemeIcon({ name, size = 20 }: { name: ThemeIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      {GLYPHS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
