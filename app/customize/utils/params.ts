import { DEFAULT_OPTIONS, FONTS, LANGUAGES, SIZES, SPEEDS, TIMEZONES, VIEW_MODES } from "../types";
import type { CustomizeOptions } from "../types";
import { THEME_KEYS } from "../data/themes";

export const PARAM_KEYS = [
  "user",
  "theme",
  "year",
  "speed",
  "font",
  "radius",
  "size",
  "hide_title",
  "hide_background",
  "hide_stats",
  "view",
  "lang",
  "tz",
] as const;

const RADIUS_MIN = 0;
const RADIUS_MAX = 50;

const values = (options: { value: string }[]) => options.map((o) => o.value);

function pick(raw: string | undefined, allowed: string[], fallback: string): string {
  return raw !== undefined && allowed.includes(raw) ? raw : fallback;
}

function pickYear(raw: string | undefined, currentYear: number): string {
  if (!raw || !/^\d{4}$/.test(raw)) return DEFAULT_OPTIONS.year;
  const year = Number(raw);
  if (year >= currentYear || year < currentYear - 10) return DEFAULT_OPTIONS.year;
  return raw;
}

function pickRadius(raw: string | undefined): number {
  const parsed = Number(raw);
  if (raw === undefined || !Number.isFinite(parsed)) return DEFAULT_OPTIONS.radius;
  return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Math.round(parsed)));
}

export function fromParams(params: Record<string, string>, currentYear: number): CustomizeOptions {
  return {
    user: (params.user ?? "").trim(),
    theme: pick(params.theme, THEME_KEYS, DEFAULT_OPTIONS.theme),
    year: pickYear(params.year, currentYear),
    speed: pick(params.speed, values(SPEEDS), DEFAULT_OPTIONS.speed),
    font: pick(params.font, values(FONTS), DEFAULT_OPTIONS.font),
    radius: pickRadius(params.radius),
    size: pick(params.size, values(SIZES), DEFAULT_OPTIONS.size),
    hideTitle: params.hide_title === "true",
    hideBackground: params.hide_background === "true",
    hideStats: params.hide_stats === "true",
    view: pick(params.view, values(VIEW_MODES), DEFAULT_OPTIONS.view),
    lang: pick(params.lang, values(LANGUAGES), DEFAULT_OPTIONS.lang),
    tz: pick(params.tz, values(TIMEZONES), DEFAULT_OPTIONS.tz),
  };
}

export function toParams(options: CustomizeOptions): Record<string, string> {
  const out: Record<string, string> = {};
  const user = options.user.trim();
  if (user) out.user = user;
  out.theme = options.theme;
  if (options.year) out.year = options.year;
  if (options.speed !== DEFAULT_OPTIONS.speed) out.speed = options.speed;
  if (options.font) out.font = options.font;
  if (options.radius !== DEFAULT_OPTIONS.radius) out.radius = String(options.radius);
  if (options.size !== DEFAULT_OPTIONS.size) out.size = options.size;
  if (options.hideTitle) out.hide_title = "true";
  if (options.hideBackground) out.hide_background = "true";
  if (options.hideStats) out.hide_stats = "true";
  if (options.view !== DEFAULT_OPTIONS.view) out.view = options.view;
  if (options.lang !== DEFAULT_OPTIONS.lang) out.lang = options.lang;
  if (options.tz !== DEFAULT_OPTIONS.tz) out.tz = options.tz;
  return out;
}

export function toQuery(options: CustomizeOptions): string {
  const params = toParams(options);
  const search = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    if (params[key] !== undefined) search.set(key, params[key]);
  }
  return search.toString();
}

export function activeParams(options: CustomizeOptions): { k: string; v: string }[] {
  const params = toParams(options);
  return PARAM_KEYS.filter((key) => params[key] !== undefined).map((key) => ({ k: key, v: params[key] }));
}
