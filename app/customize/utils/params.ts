import { BG_TYPES, DEFAULT_OPTIONS, FONTS, LANGUAGES, SIZES, SPEEDS, TIMEZONES, VIEW_MODES } from "../types";
import type { BgType, CustomizeOptions } from "../types";
import { THEME_KEYS } from "../data/themes";

export const PARAM_KEYS = [
  "user",
  "theme",
  "bg",
  "accent",
  "text",
  "bgType",
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

const BADGE_KEYS = [
  "user",
  "theme",
  "bg",
  "bgType",
  "bgStart",
  "bgEnd",
  "accent",
  "text",
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

const HEX = /^([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const GRADIENT_END_DARKEN = 0.65;

export function cleanHex(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^#+/, "");
}

export function isValidHex(raw: string | undefined): boolean {
  const value = cleanHex(raw);
  return value.length > 0 && HEX.test(value);
}

function toSixDigit(hex: string): string | null {
  const value = cleanHex(hex);
  if (!HEX.test(value)) return null;
  if (value.length === 3 || value.length === 4) {
    return value
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return value.slice(0, 6);
}

export function gradientEndFor(hex: string): string | null {
  const six = toSixDigit(hex);
  if (!six) return null;
  const channels = [0, 2, 4].map((i) => parseInt(six.slice(i, i + 2), 16));
  return channels
    .map((channel) =>
      Math.max(0, Math.round(channel * (1 - GRADIENT_END_DARKEN)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
}

const values = (options: { value: string }[]) => options.map((o) => o.value);

function pick(raw: string | undefined, allowed: string[], fallback: string): string {
  return raw !== undefined && allowed.includes(raw) ? raw : fallback;
}

function pickHex(raw: string | undefined): string {
  const value = cleanHex(raw);
  return HEX.test(value) ? value.toLowerCase() : "";
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
    bg: pickHex(params.bg),
    accent: pickHex(params.accent),
    text: pickHex(params.text),
    bgType: pick(params.bgType, values(BG_TYPES), DEFAULT_OPTIONS.bgType) as BgType,
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

function sharedParams(options: CustomizeOptions): Record<string, string> {
  const out: Record<string, string> = {};
  const user = options.user.trim();
  if (user) out.user = user;
  out.theme = options.theme;
  if (isValidHex(options.accent)) out.accent = cleanHex(options.accent).toLowerCase();
  if (isValidHex(options.text)) out.text = cleanHex(options.text).toLowerCase();
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

export function toParams(options: CustomizeOptions): Record<string, string> {
  const out = sharedParams(options);
  if (isValidHex(options.bg)) {
    out.bg = cleanHex(options.bg).toLowerCase();
    if (options.bgType !== DEFAULT_OPTIONS.bgType) out.bgType = options.bgType;
  }
  return out;
}

export function badgeParams(options: CustomizeOptions): Record<string, string> {
  const out = sharedParams(options);
  if (!isValidHex(options.bg)) return out;

  const bg = cleanHex(options.bg).toLowerCase();
  if (options.bgType === "solid") {
    out.bg = bg;
    return out;
  }

  const end = gradientEndFor(bg);
  if (!end) {
    out.bg = bg;
    return out;
  }

  out.bgType = options.bgType;
  out.bgStart = bg;
  out.bgEnd = end;
  return out;
}

export function toQuery(options: CustomizeOptions): string {
  const params = badgeParams(options);
  const search = new URLSearchParams();
  for (const key of BADGE_KEYS) {
    if (params[key] !== undefined) search.set(key, params[key]);
  }
  return search.toString();
}

export function activeParams(options: CustomizeOptions): { k: string; v: string }[] {
  const params = badgeParams(options);
  return BADGE_KEYS.filter((key) => params[key] !== undefined).map((key) => ({ k: key, v: params[key] }));
}
