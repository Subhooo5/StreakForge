"use client";

export interface HeatmapCell {
  date: string;
  count: number;
  level: number;
}

export interface HeatmapGrid {
  weeks: (HeatmapCell | null)[][];
  monthLabels: { col: number; label: string }[];
}

export interface HeatmapSource {
  date: string;
  count: number;
  intensity: number;
}

const monthOnly = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const parseDay = (date: string) => new Date(date + "T00:00:00Z");

const CELL_PX = 12;
const GAP_PX = 3;

export function buildHeatmapGrid(activity: HeatmapSource[], weeks: number): HeatmapGrid {
  if (activity.length === 0) return { weeks: [], monthLabels: [] };

  const cells: (HeatmapCell | null)[] = activity.map((d) => ({
    date: d.date,
    count: d.count,
    level: d.intensity,
  }));

  const leading = parseDay(activity[0].date).getUTCDay();
  const trailing = 6 - parseDay(activity[activity.length - 1].date).getUTCDay();
  const padded = [...new Array<HeatmapCell | null>(leading).fill(null), ...cells, ...new Array<HeatmapCell | null>(trailing).fill(null)];

  const columns: (HeatmapCell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) columns.push(padded.slice(i, i + 7));

  const visible = columns.slice(-weeks);

  const monthLabels: { col: number; label: string }[] = [];
  visible.forEach((week, col) => {
    const opener = week.find((c): c is HeatmapCell => c !== null && c.date.slice(8, 10) === "01");
    if (opener) monthLabels.push({ col, label: monthOnly.format(parseDay(opener.date)) });
  });

  return { weeks: visible, monthLabels };
}

export interface ContributionHeatmapProps {
  grid: HeatmapGrid;
  colorFor: (level: number) => string;
  showLabels?: boolean;
  minWidth?: string;
}

export default function ContributionHeatmap({ grid, colorFor, showLabels = false, minWidth }: ContributionHeatmapProps) {
  const track = `repeat(${grid.weeks.length},${CELL_PX}px)`;
  const dayNames: Record<number, string> = { 1: "Mon", 3: "Wed", 5: "Fri" };

  const cells = (
    <div style={{ display: "grid", gridTemplateColumns: track, gap: `${GAP_PX}px` }}>
      {grid.weeks.map((week, w) => (
        <div key={w} style={{ display: "grid", gridTemplateRows: `repeat(7,${CELL_PX}px)`, gap: `${GAP_PX}px` }}>
          {week.map((cell, d) => (
            <div key={d} title={cell ? cell.count + (cell.count === 1 ? " contribution on " : " contributions on ") + cell.date : undefined} style={{ width: `${CELL_PX}px`, height: `${CELL_PX}px`, borderRadius: "2.5px", background: cell ? colorFor(cell.level) : "transparent" }} />
          ))}
        </div>
      ))}
    </div>
  );

  if (!showLabels) return <div style={{ display: "inline-block", minWidth }}>{cells}</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "8px", rowGap: "5px", minWidth }}>
      <div />
      <div className="ui" style={{ display: "grid", gridTemplateColumns: track, gap: `${GAP_PX}px`, fontSize: "10px", color: "var(--faint)" }}>
        {grid.monthLabels.map((m) => (
          <span key={m.col} style={{ gridColumnStart: m.col + 1, gridColumnEnd: "span 4", whiteSpace: "nowrap" }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="ui" style={{ display: "grid", gridTemplateRows: `repeat(7,${CELL_PX}px)`, gap: `${GAP_PX}px`, fontSize: "10px", color: "var(--faint)" }}>
        {Array.from({ length: 7 }, (_, r) => (
          <span key={r} style={{ lineHeight: `${CELL_PX}px`, whiteSpace: "nowrap" }}>
            {dayNames[r] ?? ""}
          </span>
        ))}
      </div>
      {cells}
    </div>
  );
}
