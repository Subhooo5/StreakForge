import type { ContributionCalendar } from '../../types';
import { isLocDay } from '../../types';
import {
  GHOST_HEIGHT_PX,
  GRID_ORIGIN_X,
  GRID_ORIGIN_Y,
  LOG_SCALE_MULTIPLIER,
  LINEAR_SCALE_MULTIPLIER,
  MAX_LOG_HEIGHT,
  MAX_LINEAR_HEIGHT,
  MAX_SQRT_HEIGHT,
  TILE_HEIGHT_HALF,
  TILE_WIDTH_HALF,
} from './layoutConstants';

export interface FaceOpacity {
  left: number;
  right: number;
  top: number;
}

export interface TowerData {
  x: number;
  y: number;
  h: number;
  hasCommits: boolean;
  isGhost: boolean;
  isToday: boolean;
  isTodayWithCommits: boolean;
  tooltip: string;
  date: string;
  contributionCount: number;
  faceOpacity: FaceOpacity;
  strokeOpacity: number;
  strokeWidth: number;
  row: number;
  col: number;
  intensityLevel: number;
}

interface MinimalDay {
  contributionCount?: number;
  locAdditions?: number;
  locDeletions?: number;
}

interface MinimalWeek {
  contributionDays: MinimalDay[];
}

export function isGhostCity(weeks: MinimalWeek[]): boolean {
  return !weeks.some((week) =>
    week.contributionDays.some((day) => {
      const commits = day.contributionCount || 0;
      const loc = (day.locAdditions || 0) + (day.locDeletions || 0);
      return commits > 0 || loc > 0;
    })
  );
}

export function computeTowerHeight(
  count: number,
  scale: 'linear' | 'log' | 'sqrt',
  shouldShowGhostCity: boolean,
  maxCommits?: number
): number {
  if (count === 0 && shouldShowGhostCity) return GHOST_HEIGHT_PX;
  if (count === 0) return 0;
  if (scale === 'log') {
    return Math.min(Math.log2(count + 1) * LOG_SCALE_MULTIPLIER, MAX_LOG_HEIGHT);
  }
  if (scale === 'sqrt') {
    const divisor = maxCommits || count || 1;
    return Math.min(Math.sqrt(count / divisor) * MAX_SQRT_HEIGHT, MAX_SQRT_HEIGHT);
  }
  return Math.min(count * LINEAR_SCALE_MULTIPLIER, MAX_LINEAR_HEIGHT);
}

export function computeFaceOpacity(count: number, isGhostCityMode: boolean): FaceOpacity {
  if (isGhostCityMode) {
    return { left: 0, right: 0, top: 0.08 };
  }
  if (count === 0) {
    return { left: 0, right: 0, top: 0.08 };
  }
  return { left: 0.35, right: 0.21, top: 0.7 };
}

export function projectIsometric(weekIndex: number, dayIndex: number): { x: number; y: number } {
  return {
    x: GRID_ORIGIN_X + (weekIndex - dayIndex) * TILE_WIDTH_HALF,
    y: GRID_ORIGIN_Y + (weekIndex + dayIndex) * TILE_HEIGHT_HALF,
  };
}

export function computeTowers(
  calendar: ContributionCalendar,
  scale: 'linear' | 'log' | 'sqrt' = 'linear',
  todayDate: string = '',
  mode: 'commits' | 'loc' = 'commits'
): TowerData[] {
  const weeks = calendar.weeks.slice(-14);
  const towers: TowerData[] = [];

  const shouldShowGhostCity = isGhostCity(weeks);

  let maxCommits = 0;
  weeks.forEach((week) => {
    week.contributionDays.forEach((day) => {
      const count =
        mode === 'loc' && isLocDay(day)
          ? day.locAdditions + day.locDeletions
          : day.contributionCount;

      if (count > maxCommits) {
        maxCommits = count;
      }
    });
  });

  const todayInWindow = weeks.some((w) => w.contributionDays.some((d) => d.date === todayDate));

  weeks.forEach((week, i) => {
    week.contributionDays.forEach((day, j) => {
      const isToday =
        day.date === todayDate ||
        (!todayInWindow && i === weeks.length - 1 && j === week.contributionDays.length - 1);

      const count =
        mode === 'loc' && isLocDay(day)
          ? day.locAdditions + day.locDeletions
          : day.contributionCount;

      const hasCommits = count > 0;
      const isGhost = !hasCommits && shouldShowGhostCity;
      const isTodayWithCommits = isToday && hasCommits;

      const [y, m, d] = day.date.split('-');
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const formattedDate = `${monthNames[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;

      const unit = mode === 'loc' ? 'est. lines of code' : 'commits';
      const tooltip = isToday
        ? `TODAY: ${formattedDate}: ${count} ${unit}`
        : `${formattedDate}: ${count} ${unit}`;

      const dayOfWeekIndex = new Date(day.date).getUTCDay();
      const coords = projectIsometric(i, dayOfWeekIndex);

      let intensityLevel = 0;
      if (hasCommits) {
        if (maxCommits <= 4) {
          intensityLevel = Math.min(4, count);
        } else {
          const ratio = count / maxCommits;
          if (ratio <= 0.25) intensityLevel = 1;
          else if (ratio <= 0.5) intensityLevel = 2;
          else if (ratio <= 0.75) intensityLevel = 3;
          else intensityLevel = 4;
        }
      }

      towers.push({
        x: coords.x,
        y: coords.y,
        h: computeTowerHeight(count, scale, shouldShowGhostCity, maxCommits),
        hasCommits,
        isGhost,
        isToday,
        isTodayWithCommits,
        tooltip,
        date: day.date,
        contributionCount: count,
        faceOpacity: computeFaceOpacity(count, shouldShowGhostCity),
        strokeOpacity: isGhost ? 0.3 : 0,
        strokeWidth: isGhost ? 0.5 : 0,
        row: i,
        col: dayOfWeekIndex,
        intensityLevel,
      });
    });
  });

  return towers;
}
export function computeTeamTowers(
  individualCalendars: { user: string; calendar: ContributionCalendar }[],
  scale: 'linear' | 'log' | 'sqrt' = 'linear',
  todayDate: string = '',
  mode: 'commits' | 'loc' = 'commits'
): TowerData[] {
  const towers: TowerData[] = [];

  let maxCommits = 0;

  const userWeeksData = individualCalendars.map(({ user, calendar }) => {
    const weeks = calendar.weeks.slice(-14);
    const weeklyTotals = weeks.map((week) => {
      let count = 0;
      week.contributionDays.forEach((day) => {
        count +=
          mode === 'loc' && isLocDay(day)
            ? day.locAdditions + day.locDeletions
            : day.contributionCount;
      });
      if (count > maxCommits) maxCommits = count;
      return count;
    });
    return { user, weeks, weeklyTotals };
  });

  const shouldShowGhostCity = maxCommits === 0;

  userWeeksData.forEach(({ user, weeks, weeklyTotals }, userIndex) => {
    weeklyTotals.forEach((count, weekIndex) => {
      const hasCommits = count > 0;
      const isGhost = !hasCommits && shouldShowGhostCity;

      const tooltip = `${user} (Week ${weekIndex + 1}): ${count} ${mode === 'loc' ? 'est. lines of code' : 'commits'}`;
      const date = weeks[weekIndex]?.contributionDays[0]?.date || '';
      const isToday = false;
      const isTodayWithCommits = false;

      const coords = projectIsometric(weekIndex, userIndex);

      let intensityLevel = 0;
      if (hasCommits) {
        if (maxCommits <= 4) {
          intensityLevel = Math.min(4, count);
        } else {
          const ratio = count / maxCommits;
          if (ratio <= 0.25) intensityLevel = 1;
          else if (ratio <= 0.5) intensityLevel = 2;
          else if (ratio <= 0.75) intensityLevel = 3;
          else intensityLevel = 4;
        }
      }

      towers.push({
        x: coords.x,
        y: coords.y,
        h: computeTowerHeight(count, scale, shouldShowGhostCity, maxCommits),
        hasCommits,
        isGhost,
        isToday,
        isTodayWithCommits,
        tooltip,
        date,
        contributionCount: count,
        faceOpacity: computeFaceOpacity(count, shouldShowGhostCity),
        strokeOpacity: isGhost ? 0.3 : 0,
        strokeWidth: isGhost ? 0.5 : 0,
        row: weekIndex,
        col: userIndex,
        intensityLevel,
      });
    });
  });

  return towers;
}
