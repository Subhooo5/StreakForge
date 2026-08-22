// Option sets and state shape for the Customization Studio.
//
// Every value here is one the badge route actually accepts: the option values
// are the literal `/api/streak` query values (`view=punchcard`, `lang=ja`,
// `speed=12s`, …), validated server-side by `streakParamsSchema`. Keeping the
// UI's vocabulary identical to the badge's is what lets the page URL, the
// export snippet and the live preview all be built from one object.

export interface LabelledOption {
  value: string;
  label: string;
}

/** Backdrop the Live Preview simulates the badge against. */
export type PreviewBg = "dark" | "light" | "grid";

export const PREVIEW_BGS: { value: PreviewBg; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "grid", label: "Grid" },
];

export type ExportFormat = "markdown" | "html" | "tsx" | "action";

export const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "tsx", label: "React TSX" },
  { value: "action", label: "GitHub Action" },
];

/** `speed=` — the badge clamps to 2s–20s. */
export const SPEEDS: LabelledOption[] = [
  { value: "4s", label: "Snappy (4s)" },
  { value: "8s", label: "Default (8s)" },
  { value: "12s", label: "Calm (12s)" },
  { value: "20s", label: "Ultra-slow (20s)" },
];

export const SIZES: LabelledOption[] = [
  { value: "small", label: "Compact" },
  { value: "medium", label: "Medium (Default)" },
  { value: "large", label: "Large" },
];

/**
 * `font=` — only keys already bundled into the badge (`lib/svg/fonts.ts`
 * FONT_MAP) are offered, so the chosen face renders everywhere the SVG is
 * embedded rather than depending on a Google Fonts fetch the host may block.
 */
export const FONTS: LabelledOption[] = [
  { value: "", label: "Default" },
  { value: "jetbrains", label: "JetBrains Mono" },
  { value: "fira", label: "Fira Code" },
  { value: "roboto", label: "Roboto" },
  { value: "spacegrotesk", label: "Space Grotesk" },
  { value: "syncopate", label: "Syncopate" },
];

/** `view=` — the badge layouts this page exposes. */
export const VIEW_MODES: LabelledOption[] = [
  { value: "default", label: "Default" },
  { value: "monthly", label: "Monthly" },
  { value: "pulse", label: "Heartbeat Pulse" },
  { value: "skyline", label: "Skyline Horizon" },
  { value: "languages", label: "Top Languages Skyline" },
  { value: "punchcard", label: "Punch Card Heatmap" },
];

/**
 * `lang=` — translates the three stat labels rendered inside the SVG
 * (`lib/i18n/badgeLabels.ts`). This is badge-only: the site UI is not
 * translated.
 */
export const LANGUAGES: LabelledOption[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" },
  { value: "hi", label: "हिन्दी" },
  { value: "ta", label: "தமிழ்" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

/** `tz=` — which midnight the streak rolls over at. */
export const TIMEZONES: LabelledOption[] = [
  { value: "UTC", label: "UTC (Default)" },
  { value: "America/New_York", label: "America / New York" },
  { value: "Europe/London", label: "Europe / London" },
  { value: "Asia/Kolkata", label: "Asia / Kolkata" },
  { value: "Asia/Tokyo", label: "Asia / Tokyo" },
];

/** How many past years the Sync Year select offers alongside the current one. */
export const SYNC_YEAR_DEPTH = 3;

/**
 * Sync Year options, newest first. The current year is the default and is
 * represented by an empty value: omitting `year=` gives the badge's rolling
 * window, which is what every other page's badge shows.
 */
export function syncYearOptions(currentYear: number): LabelledOption[] {
  const out: LabelledOption[] = [{ value: "", label: `${currentYear} (current)` }];
  for (let i = 1; i <= SYNC_YEAR_DEPTH; i++) {
    out.push({ value: String(currentYear - i), label: String(currentYear - i) });
  }
  return out;
}

/** The full customisation state — one object, mirrored 1:1 into the page URL. */
export interface CustomizeOptions {
  user: string;
  theme: string;
  /** '' = current year (no `year=` param). */
  year: string;
  speed: string;
  /** '' = the badge's default face. */
  font: string;
  radius: number;
  size: string;
  hideTitle: boolean;
  hideBackground: boolean;
  hideStats: boolean;
  view: string;
  lang: string;
  tz: string;
}

/**
 * Defaults. Anything equal to its default is left out of the URL and out of
 * the badge query, so a freshly-loaded studio produces exactly the same badge
 * URL the rest of the app uses.
 */
export const DEFAULT_OPTIONS: CustomizeOptions = {
  user: "",
  theme: "dark",
  year: "",
  speed: "8s",
  font: "",
  radius: 8,
  size: "medium",
  hideTitle: false,
  hideBackground: false,
  hideStats: false,
  view: "default",
  lang: "en",
  tz: "UTC",
};
