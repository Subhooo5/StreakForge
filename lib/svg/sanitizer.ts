import type { HexColor } from '../../types/index';
import type { SpeedString } from '../../types/index';

const HEX_COLOR_REGEX = /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

export function isValidHex(color?: string): boolean {
  if (!color) return false;
  const cleanColor = color.replace(/^#+/, '');
  return HEX_COLOR_REGEX.test(cleanColor);
}

export function hexColor(value: string, fallback = '000000'): HexColor {
  const cleaned = value.replace(/^#+/, '');
  if (HEX_COLOR_REGEX.test(cleaned)) {
    return cleaned as HexColor;
  }
  return fallback.replace(/^#+/, '') as HexColor;
}

export function sanitizeHexColor(input: string | undefined | null, fallback: string): HexColor {
  if (!input) return fallback.replace(/^#+/, '') as HexColor;

  const cleanInput = input.trim().replace(/^#+/, '');

  if (HEX_COLOR_REGEX.test(cleanInput)) {
    return cleanInput as HexColor;
  }

  return fallback.replace(/^#+/, '') as HexColor;
}

export function sanitizeSpeed(speed: string | undefined | null, fallback = '8s'): SpeedString {
  if (!speed) return fallback as SpeedString;
  const trimmed = speed.trim();
  const match = trimmed.match(/^(\d+(\.\d+)?)s$/);
  if (match) {
    const numeric = parseFloat(match[1]);
    if (numeric >= 2 && numeric <= 20) {
      return trimmed as SpeedString;
    }
  }
  return fallback as SpeedString;
}

export function sanitizeRadius(radius: string | number | undefined | null, fallback = 8): number {
  const parsed = typeof radius === 'number' ? radius : parseInt(String(radius), 10);
  if (isNaN(parsed)) return fallback;
  return Math.max(0, Math.min(parsed, 50));
}

export function sanitizeFont(font: string | undefined | null): string | null {
  if (!font) return null;
  const trimmed = font.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
  return cleaned || null;
}

export function sanitizeDimension(
  value: string | number | undefined | null,
  fallback: number,
  min = 1,
  max = 5000
): number {
  const safeFallback = Math.round(Math.max(min, Math.min(fallback, max)));

  if (value === undefined || value === null) return safeFallback;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return safeFallback;
    return Math.round(Math.max(min, Math.min(value, max)));
  }

  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.round(Math.max(min, Math.min(parsed, max)));
    }
  }

  return safeFallback;
}

export function sanitizeGoogleFontUrl(fontName: string | undefined | null): string | null {
  if (!fontName) return null;

  const trimmed = fontName.trim();
  if (!trimmed) return null;

  if (!/^[a-zA-Z0-9\s\-]+$/.test(trimmed)) {
    return null;
  }

  const cleaned = sanitizeFont(trimmed);
  if (!cleaned) return null;

  return cleaned.replace(/\s+/g, '+');
}

export function getLuminance(hex: string): number {
  let normalized = hex.trim().replace(/^#/, '');
  if (normalized.length === 3 || normalized.length === 4) {
    normalized = `${normalized[0]}${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}`;
  }
  const r = parseInt(normalized.slice(0, 2), 16) / 255 || 0;
  const g = parseInt(normalized.slice(2, 4), 16) / 255 || 0;
  const b = parseInt(normalized.slice(4, 6), 16) / 255 || 0;

  const [R, G, B] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function normalizeHexColor(color: string): string | null {
  if (!color) return null;
  const trimmed = color.trim();
  const cleaned = trimmed.replace(/^#+/, '');
  if (HEX_COLOR_REGEX.test(cleaned)) {
    return cleaned;
  }
  return null;
}

export const MAX_GRADIENT_STOPS = 10;

export function parseGradientStops(input?: string): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }

  const colors = input
    .split(',')
    .slice(0, MAX_GRADIENT_STOPS)
    .map((color) => normalizeHexColor(color))
    .filter((color) => color !== null)
    .slice(0, 10) as string[];

  return colors;
}

export function getGradientCoordinates(dir?: string): {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
} {
  const direction = (dir || 'vertical').toLowerCase().trim();

  switch (direction) {
    case 'horizontal':
      return { x1: '0%', y1: '0%', x2: '100%', y2: '0%' };
    case 'diagonal':
      return { x1: '0%', y1: '0%', x2: '100%', y2: '100%' };
    case 'vertical':
    default:
      return { x1: '0%', y1: '0%', x2: '0%', y2: '100%' };
  }
}

export function escapeXML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

export function sanitizeCustomText(text: string | undefined | null): string {
  if (!text) return '';
  return escapeXML(text);
}
