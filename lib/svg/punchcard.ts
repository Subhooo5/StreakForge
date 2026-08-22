import type { BadgeParams, StreakStats } from '../../types';
import { DEFAULT_FONTS_BASE64, resolveFontFamily } from './fonts';
import { escapeXML, sanitizeHexColor } from './sanitizer';
import { getSizeScale, truncateUsername } from './generator';

const WIDTH = 800;
const HEIGHT = 400;

const TILE_W = 12;
const TILE_H = 6.5;

const TOWER_MIN = 4;
const TOWER_SPAN = 46;

const DAYS = 7;
const HOURS = 24;

const ORIGIN_X = WIDTH / 2 - ((HOURS - DAYS) * TILE_W) / 2 - 20;
const ORIGIN_Y = 160;

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_TICKS: [number, string][] = [
  [0, '12a'],
  [6, '6a'],
  [12, '12p'],
  [18, '6p'],
];

function tilePos(day: number, hour: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (hour - day) * TILE_W,
    y: ORIGIN_Y + (hour + day) * TILE_H,
  };
}

function tower(x: number, y: number, height: number, color: string, opacity: number): string {
  const top = -height;
  const mid = -height + TILE_H;
  const base = -height + 2 * TILE_H;
  return (
    `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})" opacity="${opacity.toFixed(2)}">` +
    `<polygon points="0,${top} ${TILE_W},${mid} 0,${base} ${-TILE_W},${mid}" fill="${color}" opacity="0.9"/>` +
    `<polygon points="${-TILE_W},${mid} 0,${base} 0,${2 * TILE_H} ${-TILE_W},${TILE_H}" fill="${color}" opacity="0.7"/>` +
    `<polygon points="0,${base} ${TILE_W},${mid} ${TILE_W},${TILE_H} 0,${2 * TILE_H}" fill="${color}" opacity="0.5"/>` +
    `</g>`
  );
}

export function generatePunchcardSVG(
  punchCard: number[][],
  stats: StreakStats,
  params: BadgeParams
): string {
  const scale = getSizeScale(params.size);
  const safeUser = escapeXML(truncateUsername(params.user));
  const bg = sanitizeHexColor(params.bg, '0d1117');
  const text = sanitizeHexColor(Array.isArray(params.accent) ? undefined : params.text, 'c9d1d9');
  const accent = sanitizeHexColor(
    Array.isArray(params.accent) ? params.accent[params.accent.length - 1] : params.accent,
    '58a6ff'
  );
  const font = resolveFontFamily(params.font) || "'Space Grotesk', sans-serif";

  let busiest = 1;
  for (const day of punchCard) {
    for (const count of day) {
      if (count > busiest) busiest = count;
    }
  }

  const cells: { day: number; hour: number; count: number }[] = [];
  for (let day = 0; day < DAYS; day++) {
    for (let hour = 0; hour < HOURS; hour++) {
      const count = punchCard[day]?.[hour] ?? 0;
      if (count > 0) cells.push({ day, hour, count });
    }
  }
  cells.sort((a, b) => a.day + a.hour - (b.day + b.hour) || a.hour - b.hour);

  const towers = cells
    .map(({ day, hour, count }) => {
      const ratio = count / busiest;
      const { x, y } = tilePos(day, hour);
      return tower(x, y, TOWER_MIN + ratio * TOWER_SPAN, `#${accent}`, 0.3 + 0.7 * ratio);
    })
    .join('');

  const dayLabels = DAY_NAMES.map((name, day) => {
    const x = ORIGIN_X + (-2 - day) * TILE_W;
    const y = ORIGIN_Y + (-2 + day) * TILE_H;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#${text}" font-family="${font}" font-size="11" font-weight="600" opacity="0.6" text-anchor="end">${name}</text>`;
  }).join('');

  const hourLabels = HOUR_TICKS.map(([hour, name]) => {
    const x = ORIGIN_X + (hour + 1) * TILE_W;
    const y = ORIGIN_Y + (hour - 1) * TILE_H - 12;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#${text}" font-family="${font}" font-size="11" font-weight="600" opacity="0.6" text-anchor="middle">${name}</text>`;
  }).join('');

  const radius = params.radius ?? 8;
  const title = params.hide_title
    ? ''
    : `<text x="40" y="50" fill="#${text}" font-family="${font}" font-size="18" font-weight="700">${escapeXML(params.custom_title || `Circadian Rhythm : ${safeUser}`)}</text>`;
  const total = params.hide_stats
    ? ''
    : `<text x="40" y="74" fill="#${text}" font-family="${font}" font-size="13" opacity="0.7">Total Commits: <tspan font-weight="700" fill="#${accent}">${stats.totalContributions}</tspan></text>`;

  return `<svg style="max-width: 100%; height: auto;" xmlns="http://www.w3.org/2000/svg" width="${Math.round(WIDTH * scale)}" height="${Math.round(HEIGHT * scale)}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="sf-punch-title" aria-describedby="sf-punch-desc">
  <title id="sf-punch-title">StreakForge punch card for ${safeUser}</title>
  <desc id="sf-punch-desc">An isometric grid showing ${safeUser}'s commit frequency by day of week and hour of day.</desc>
  <defs>
    <style>
      ${DEFAULT_FONTS_BASE64}
      @media (prefers-reduced-motion: reduce) {
        *, ::before, ::after { animation: none !important; transition: none !important; }
      }
    </style>
  </defs>
  ${params.hideBackground ? '' : `<rect width="${WIDTH}" height="${HEIGHT}" fill="#${bg}" rx="${radius}"/>`}
  ${title}
  ${total}
  <g transform="translate(0,40)">
    ${dayLabels}
    ${hourLabels}
    ${towers}
  </g>
</svg>`;
}
