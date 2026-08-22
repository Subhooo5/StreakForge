export interface LabelledOption {
  value: string;
  label: string;
}

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

export const FONTS: LabelledOption[] = [
  { value: "", label: "Default" },
  { value: "jetbrains", label: "JetBrains Mono" },
  { value: "fira", label: "Fira Code" },
  { value: "roboto", label: "Roboto" },
  { value: "spacegrotesk", label: "Space Grotesk" },
  { value: "syncopate", label: "Syncopate" },
];

export const VIEW_MODES: LabelledOption[] = [
  { value: "default", label: "Default" },
  { value: "monthly", label: "Monthly" },
  { value: "pulse", label: "Heartbeat Pulse" },
  { value: "skyline", label: "Skyline Horizon" },
  { value: "languages", label: "Top Languages Skyline" },
  { value: "punchcard", label: "Punch Card Heatmap" },
];

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

export const TIMEZONES: LabelledOption[] = [
  { value: "UTC", label: "UTC (Default)" },
  { value: "America/New_York", label: "America / New York" },
  { value: "Europe/London", label: "Europe / London" },
  { value: "Asia/Kolkata", label: "Asia / Kolkata" },
  { value: "Asia/Tokyo", label: "Asia / Tokyo" },
];

export const SYNC_YEAR_DEPTH = 3;

export function syncYearOptions(currentYear: number): LabelledOption[] {
  const out: LabelledOption[] = [{ value: "", label: `${currentYear} (current)` }];
  for (let i = 1; i <= SYNC_YEAR_DEPTH; i++) {
    out.push({ value: String(currentYear - i), label: String(currentYear - i) });
  }
  return out;
}

export interface CustomizeOptions {
  user: string;
  theme: string;
  year: string;
  speed: string;
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
