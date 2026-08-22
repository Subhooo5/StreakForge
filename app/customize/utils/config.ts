// Export / import of a studio configuration as a small versioned JSON file.
//
// The file carries the state object itself (not a URL), so it stays readable
// and diffable. On the way back in, every field is pushed through the same
// sanitiser the URL uses — an edited or hand-written file can only ever
// produce a valid configuration.

import { DEFAULT_OPTIONS } from "../types";
import type { CustomizeOptions } from "../types";
import { fromParams } from "./params";

/** Bumped only if the shape changes in a way older files cannot satisfy. */
export const CONFIG_VERSION = 1 as const;

export const CONFIG_FILENAME = "streakforge-config.json";

export interface ConfigFile {
  version: typeof CONFIG_VERSION;
  config: CustomizeOptions;
}

/** Serialised form of the current state, pretty-printed for humans. */
export function serializeConfig(options: CustomizeOptions): string {
  const payload: ConfigFile = { version: CONFIG_VERSION, config: options };
  return JSON.stringify(payload, null, 2);
}

/** Triggers a browser download of the current configuration. */
export function downloadConfig(options: CustomizeOptions): void {
  const blob = new Blob([serializeConfig(options)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = CONFIG_FILENAME;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type ParseResult = { ok: true; options: CustomizeOptions } | { ok: false; error: string };

/**
 * Parses a configuration file's text.
 *
 * @param text     raw file contents
 * @param currentYear year the Sync Year field is validated against
 */
export function parseConfig(text: string, currentYear: number): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "That file doesn't contain a configuration." };
  }

  const file = parsed as Partial<ConfigFile>;
  if (file.version !== CONFIG_VERSION) {
    return { ok: false, error: `Unsupported config version — expected ${CONFIG_VERSION}.` };
  }
  if (typeof file.config !== "object" || file.config === null) {
    return { ok: false, error: "That config file has no settings in it." };
  }

  const raw = file.config as Partial<CustomizeOptions>;
  const asParams: Record<string, string> = {};
  if (typeof raw.user === "string") asParams.user = raw.user;
  if (typeof raw.theme === "string") asParams.theme = raw.theme;
  if (typeof raw.year === "string") asParams.year = raw.year;
  if (typeof raw.speed === "string") asParams.speed = raw.speed;
  if (typeof raw.font === "string") asParams.font = raw.font;
  if (typeof raw.radius === "number") asParams.radius = String(raw.radius);
  if (typeof raw.size === "string") asParams.size = raw.size;
  if (raw.hideTitle === true) asParams.hide_title = "true";
  if (raw.hideBackground === true) asParams.hide_background = "true";
  if (raw.hideStats === true) asParams.hide_stats = "true";
  if (typeof raw.view === "string") asParams.view = raw.view;
  if (typeof raw.lang === "string") asParams.lang = raw.lang;
  if (typeof raw.tz === "string") asParams.tz = raw.tz;

  return { ok: true, options: { ...DEFAULT_OPTIONS, ...fromParams(asParams, currentYear) } };
}
