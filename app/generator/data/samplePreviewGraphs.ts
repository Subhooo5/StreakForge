const GITHUB_GREENS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

function sampleIntensity(col: number, row: number): number {
  const seed = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  return Math.floor((seed - Math.floor(seed)) * 5);
}

const COLS = 26;
const ROWS = 7;
const CELL = 11;
const GAP = 3;
const GRID_WIDTH = COLS * (CELL + GAP) - GAP;
const GRID_HEIGHT = ROWS * (CELL + GAP) - GAP;

function buildGrid(): string {
  let rects = '';
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const x = col * (CELL + GAP);
      const y = row * (CELL + GAP);
      rects += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${GITHUB_GREENS[sampleIntensity(col, row)]}" />`;
    }
  }
  return rects;
}

function buildSnakeSvg(): string {
  const cells: [number, number][] = [
    [2, 3],
    [3, 3],
    [4, 3],
    [4, 2],
    [5, 2],
    [6, 2],
    [6, 3],
    [7, 3],
  ];
  const body = cells
    .map(([col, row], i) => {
      const x = col * (CELL + GAP);
      const y = row * (CELL + GAP);
      const head = i === cells.length - 1;
      return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${head ? '#ffffff' : '#3fba50'}" stroke="#0d1117" stroke-width="0.5" />`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID_WIDTH} ${GRID_HEIGHT}" width="${GRID_WIDTH}" height="${GRID_HEIGHT}"><rect width="${GRID_WIDTH}" height="${GRID_HEIGHT}" fill="#0d1117" />${buildGrid()}${body}</svg>`;
}

function buildPacmanSvg(): string {
  const x = 5 * (CELL + GAP) + CELL / 2;
  const y = 3 * (CELL + GAP) + CELL / 2;
  const r = CELL * 0.85;
  const mouth = `M ${x} ${y} L ${x + r} ${y - r * 0.55} A ${r} ${r} 0 1 1 ${x + r} ${y + r * 0.55} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID_WIDTH} ${GRID_HEIGHT}" width="${GRID_WIDTH}" height="${GRID_HEIGHT}"><rect width="${GRID_WIDTH}" height="${GRID_HEIGHT}" fill="#0d1117" />${buildGrid()}<path d="${mouth}" fill="#ffe35a" /><circle cx="${x - r * 0.15}" cy="${y - r * 0.55}" r="1.1" fill="#0d1117" /></svg>`;
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22')}`;
}

export const SNAKE_SAMPLE_PREVIEW_SRC = toDataUri(buildSnakeSvg());
export const PACMAN_SAMPLE_PREVIEW_SRC = toDataUri(buildPacmanSvg());
