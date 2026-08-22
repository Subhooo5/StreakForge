import type { ThemeIconName } from "../components/ThemeIcon";

// Mirrors the lib/svg/themes.ts registry

export interface ThemePreset {
  key: string;
  label: string;
  icon: ThemeIconName;
  bg: string;
  text: string;
  accent: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { key: "default", label: "Default", icon: "spark", bg: "#0d1117", text: "#ffffff", accent: "#2da44e" },
  { key: "dark", label: "Dark", icon: "moon", bg: "#0d1117", text: "#c9d1d9", accent: "#58a6ff" },
  { key: "light", label: "Light", icon: "sun", bg: "#ffffff", text: "#24292f", accent: "#0969da" },
  { key: "neon", label: "Neon", icon: "bolt", bg: "#000000", text: "#00ffcc", accent: "#ff00ff" },
  { key: "github", label: "GitHub", icon: "brackets", bg: "#0d1117", text: "#ffffff", accent: "#238636" },
  { key: "dracula", label: "Dracula", icon: "bat", bg: "#282a36", text: "#f8f8f2", accent: "#bd93f9" },
  { key: "ocean", label: "Ocean", icon: "waves", bg: "#0a192f", text: "#ccd6f6", accent: "#64ffda" },
  { key: "sunset", label: "Sunset", icon: "sunHorizon", bg: "#1a0a0a", text: "#ffd6c0", accent: "#ff6b35" },
  { key: "forest", label: "Forest", icon: "pine", bg: "#0d1f0d", text: "#c8f0c8", accent: "#39d353" },
  { key: "rose", label: "Rose", icon: "flower", bg: "#1f0d14", text: "#f0c8d4", accent: "#ff6b9d" },
  { key: "nord", label: "Nord", icon: "snowflake", bg: "#2e3440", text: "#d8dee9", accent: "#88c0d0" },
  { key: "synthwave", label: "Synthwave", icon: "retroSun", bg: "#0d0221", text: "#f8f8f2", accent: "#ff2d78" },
  { key: "gruvbox", label: "Gruvbox", icon: "box", bg: "#282828", text: "#ebdbb2", accent: "#fe8019" },
  { key: "aurora_cyberpunk", label: "Aurora Cyberpunk", icon: "aurora", bg: "#090B13", text: "#EAF2FF", accent: "#9D5CFF" },
  { key: "highcontrast", label: "High Contrast", icon: "contrast", bg: "#0a0a0a", text: "#ffffff", accent: "#ff4500" },
  { key: "catppuccin_latte", label: "Catppuccin Latte", icon: "coffee", bg: "#eff1f5", text: "#4c4f69", accent: "#1e66f5" },
  { key: "solarized_light", label: "Solarized Light", icon: "solar", bg: "#fdf6e3", text: "#586e75", accent: "#268bd2" },
  { key: "gruvbox_light", label: "Gruvbox Light", icon: "boxLight", bg: "#fbf1c7", text: "#3c3836", accent: "#d65d0e" },
  { key: "nord_light", label: "Nord Light", icon: "snowLight", bg: "#eceff4", text: "#2e3440", accent: "#5e81ac" },
  { key: "obsidian", label: "Obsidian", icon: "gem", bg: "#1a1a2e", text: "#e2e8f0", accent: "#f59e0b" },
  { key: "cyber-pulse", label: "Cyber Pulse", icon: "pulse", bg: "#000000", text: "#ffffff", accent: "#00ffee" },
  { key: "retro-terminal", label: "Retro Terminal", icon: "terminal", bg: "#000000", text: "#00ff41", accent: "#00ff41" },
  { key: "glacier", label: "Glacier", icon: "iceberg", bg: "#e0f2fe", text: "#0369a1", accent: "#06b6d4" },
  { key: "lumos", label: "Lumos", icon: "bulb", bg: "#0a0a0a", text: "#a7f3d0", accent: "#fbbf24" },
  { key: "tokyonight", label: "Tokyonight", icon: "skylineNight", bg: "#1a1b26", text: "#c0caf5", accent: "#f7768e" },
  { key: "cyberpunk", label: "Cyberpunk", icon: "chip", bg: "#fce22a", text: "#111111", accent: "#ff003c" },
  { key: "cyberpunk_neon", label: "Cyberpunk Neon", icon: "chipNeon", bg: "#0d0d14", text: "#00f3ff", accent: "#ff0055" },
  { key: "tokyo_night", label: "Tokyo Night", icon: "skyline", bg: "#1a1b26", text: "#c0caf5", accent: "#7aa2f7" },
  { key: "monokai", label: "Monokai", icon: "palette", bg: "#272822", text: "#f8f8f2", accent: "#a6e22e" },
  { key: "midnight_ocean", label: "Midnight Ocean", icon: "moonWaves", bg: "#020c1b", text: "#ccd6f6", accent: "#0af5ff" },
  { key: "enterprise", label: "Enterprise", icon: "tower", bg: "#1a1a2e", text: "#e2e8f0", accent: "#6366f1" },
  { key: "india", label: "India", icon: "chakra", bg: "#0a0a0a", text: "#ffffff", accent: "#FF9933" },
  { key: "ayu_mirage", label: "Ayu Mirage", icon: "dune", bg: "#212733", text: "#D9D7CE", accent: "#FFCC66" },
];

export const THEME_KEYS = THEME_PRESETS.map((t) => t.key);

const BY_KEY = new Map(THEME_PRESETS.map((t) => [t.key, t]));

export function themePreset(key: string): ThemePreset {
  return BY_KEY.get(key) ?? BY_KEY.get("dark")!;
}
