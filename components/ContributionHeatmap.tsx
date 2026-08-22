"use client";

// The one contribution-heatmap implementation, shared by the Dashboard's
// Historical Heatmap (53 weeks, month/day captions, accent scale) and the
// Compare results page's activity strips (13 weeks, no captions, GitHub's own
// scale). Per CLAUDE.md's core-once principle there is exactly one cell
// layout: 12px cells on a 3px gap, one grid column per week, seven rows per
// column, Sunday first.
//
// Callers supply the colour scale, so the Compare page keeps its sanctioned
// GitHub palette while the Dashboard keeps its `--accent` ramp.

/** One day in the grid. `level` is a 0–4 contribution intensity. */
export interface HeatmapCell {
  date: string;
  count: number;
  level: number;
}

export interface HeatmapGrid {
  /** Columns of 7 days, Sunday first. `null` = padding outside the data range. */
  weeks: (HeatmapCell | null)[][];
  /** Month captions, positioned by column index. */
  monthLabels: { col: number; label: string }[];
}

/** Anything with a date, a count and a 0–4 intensity can seed the grid. */
export interface HeatmapSource {
  date: string;
  count: number;
  intensity: number;
}

const monthOnly = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const parseDay = (date: string) => new Date(date + "T00:00:00Z");

/** Cell 12px + 3px gap — the column pitch every axis label aligns to. */
const CELL_PX = 12;
const GAP_PX = 3;

/**
 * Bucket a run of daily contributions into whole Sunday-first weeks, keeping
 * the trailing `weeks` columns.
 */
export function buildHeatmapGrid(activity: HeatmapSource[], weeks: number): HeatmapGrid {
  if (activity.length === 0) return { weeks: [], monthLabels: [] };

  const cells: (HeatmapCell | null)[] = activity.map((d) => ({
    date: d.date,
    count: d.count,
    level: d.intensity,
  }));

  // Pad both edges so the first cell is a Sunday and the last week is whole.
  const leading = parseDay(activity[0].date).getUTCDay();
  const trailing = 6 - parseDay(activity[activity.length - 1].date).getUTCDay();
  const padded = [...new Array<HeatmapCell | null>(leading).fill(null), ...cells, ...new Array<HeatmapCell | null>(trailing).fill(null)];

  const columns: (HeatmapCell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) columns.push(padded.slice(i, i + 7));

  const visible = columns.slice(-weeks);

  // GitHub captions the column that contains the 1st of a month, so a leading
  // partial column is attributed to the month that actually starts inside it.
  const monthLabels: { col: number; label: string }[] = [];
  visible.forEach((week, col) => {
    const opener = week.find((c): c is HeatmapCell => c !== null && c.date.slice(8, 10) === "01");
    if (opener) monthLabels.push({ col, label: monthOnly.format(parseDay(opener.date)) });
  });

  return { weeks: visible, monthLabels };
}

export interface ContributionHeatmapProps {
  grid: HeatmapGrid;
  /** Background for a cell at the given 0–4 intensity. */
  colorFor: (level: number) => string;
  /** Month captions above and Mon/Wed/Fri down the side. */
  showLabels?: boolean;
  /** Floor width, so a wide grid scrolls rather than squashing. */
  minWidth?: string;
}

export default function ContributionHeatmap({ grid, colorFor, showLabels = false, minWidth }: ContributionHeatmapProps) {
  const track = `repeat(${grid.weeks.length},${CELL_PX}px)`;
  // GitHub captions rows 1/3/5 only, so the labels never crowd the grid.
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
