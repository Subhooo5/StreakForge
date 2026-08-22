import 'server-only';

import type {
  ContributionCalendar,
  ContributionDay,
  ContributionWeek,
  StreakStats,
  MonthlyStats,
} from '../types';

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

export function calculateSafePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export function convertLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): string {
  try {
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(utcDate);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const tzYear = parseInt(partMap.year, 10);
    const tzMonth = parseInt(partMap.month, 10);
    const tzDay = parseInt(partMap.day, 10);
    let tzHour = parseInt(partMap.hour, 10);
    if (tzHour === 24) tzHour = 0;
    const tzMin = parseInt(partMap.minute, 10);
    const tzSec = parseInt(partMap.second, 10);

    const tzUtcTime = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, tzSec);
    const offsetMs = tzUtcTime - utcDate.getTime();
    const targetUtcTime = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs;
    return new Date(targetUtcTime).toISOString().replace('.000Z', 'Z');
  } catch {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
      .toISOString()
      .replace('.000Z', 'Z');
  }
}

export function getLocalTodayStr(now: Date, timezone: string): string {
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();

  for (let offset = -1; offset <= 1; offset++) {
    const candidateDate = new Date(Date.UTC(utcYear, utcMonth, utcDate + offset));
    const y = candidateDate.getUTCFullYear();
    const m = candidateDate.getUTCMonth() + 1;
    const d = candidateDate.getUTCDate();

    const dateStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

    const midnightUtcStr = convertLocalToUtc(y, m, d, 0, 0, 0, timezone);
    const nextMidnightUtcStr = convertLocalToUtc(y, m, d + 1, 0, 0, 0, timezone);

    const midnightTime = new Date(midnightUtcStr).getTime();
    const nextMidnightTime = new Date(nextMidnightUtcStr).getTime();

    const nowTime = now.getTime();
    if (nowTime >= midnightTime && nowTime < nextMidnightTime) {
      return dateStr;
    }
  }

  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
  } catch {
    return now.toISOString().split('T')[0];
  }
}

export function isStreakAlive(
  today?: { contributionCount: number } | null,
  yesterday?: { contributionCount: number } | null
): boolean {
  if (!today) {
    return (yesterday?.contributionCount ?? 0) > 0;
  }
  return today.contributionCount > 0 || (yesterday?.contributionCount ?? 0) > 0;
}

export function findTodayIndex(
  days?: ContributionDay[] | null,
  timezone?: string | null,
  now?: Date | null
): number {
  if (!days || !Array.isArray(days)) {
    return -1;
  }
  const tz = timezone || 'UTC';
  const currentDate = now || new Date();
  const localTodayStr = getLocalTodayStr(currentDate, tz);

  const localTodayIndex = days.findIndex((d) => d && d.date === localTodayStr);

  return localTodayIndex !== -1 ? localTodayIndex : -1;
}
function getDayDifference(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);

  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export function calculateStreak(
  calendar?: ContributionCalendar | null,
  timezone: string = 'UTC',
  now: Date = new Date(),
  grace: number = 1
): StreakStats {
  const localTodayStr = getLocalTodayStr(now, timezone);

  if (!calendar) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalContributions: 0,
      todayDate: localTodayStr,
    };
  }

  const weeks = calendar.weeks || [];
  const days = weeks.flatMap((week) => week?.contributionDays || []).filter(Boolean);

  const seen = new Set<string>();
  const uniqueDays = days
    .filter((d) => {
      if (!d || seen.has(d.date)) return false;
      seen.add(d.date);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (const day of uniqueDays) {
    if (day && day.contributionCount > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  let todayIndex = findTodayIndex(uniqueDays, timezone, now);

  if (todayIndex < 0) {
    const lastIndex = uniqueDays.length - 1;

    if (lastIndex < 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalContributions: calendar.totalContributions || 0,
        todayDate: localTodayStr,
      };
    }

    const lastDateStr = uniqueDays[lastIndex]?.date;

    if (lastDateStr && localTodayStr > lastDateStr) {
      const gapDays = Math.floor(
        (new Date(localTodayStr).getTime() - new Date(lastDateStr).getTime()) / 86400000
      );

      if (gapDays > Math.max(1, grace)) {
        todayIndex = -1;
      } else {
        todayIndex = lastIndex;
      }
    } else {
      return {
        currentStreak: 0,
        longestStreak,
        totalContributions: calendar.totalContributions || 0,
        todayDate: localTodayStr,
      };
    }
  }

  let consecutiveZeroDays = 0;
  if (todayIndex >= 0) {
    let idx = todayIndex - 1;
    while (idx >= 0 && uniqueDays[idx].contributionCount === 0) {
      consecutiveZeroDays++;
      idx--;
    }
  }

  const isActualToday = todayIndex >= 0 && uniqueDays[todayIndex].date === localTodayStr;
  const todayHasCommits = todayIndex >= 0 && uniqueDays[todayIndex].contributionCount > 0;

  const evaluationIndex =
    isActualToday && !todayHasCommits && consecutiveZeroDays < Math.max(1, grace)
      ? todayIndex - 1
      : todayIndex;

  let isStreakAlive = false;
  for (let i = 0; i <= grace; i++) {
    const checkIndex = evaluationIndex - i;
    if (checkIndex >= 0 && uniqueDays[checkIndex] && uniqueDays[checkIndex].contributionCount > 0) {
      isStreakAlive = true;
      break;
    }
  }

  if (isStreakAlive) {
    let i = evaluationIndex;
    while (
      i >= evaluationIndex - grace &&
      i >= 0 &&
      uniqueDays[i] &&
      uniqueDays[i].contributionCount === 0
    ) {
      i--;
    }
    while (i >= 0 && uniqueDays[i] && uniqueDays[i].contributionCount > 0) {
      currentStreak++;
      i--;
    }
  } else {
    currentStreak = 0;
  }

  const todayDate = uniqueDays[todayIndex]?.date ?? localTodayStr;

  return {
    currentStreak,
    longestStreak,
    totalContributions: calendar.totalContributions || 0,
    todayDate,
  };
}

export function calculateMonthlyStats(
  calendar?: ContributionCalendar | null,
  timezone: string = 'UTC',
  now: Date = new Date()
): MonthlyStats {
  const currentMonthName = (() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        month: 'long',
      }).format(now || new Date());
    } catch {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        month: 'long',
      }).format(now || new Date());
    }
  })();

  if (!calendar) {
    return {
      currentMonthTotal: 0,
      previousMonthTotal: 0,
      deltaPercentage: null,
      deltaAbsolute: 0,
      currentMonthName,
    };
  }

  const weeks = calendar.weeks || [];
  const days = weeks.flatMap((week) => week?.contributionDays || []).filter(Boolean);

  const localTodayStr = getLocalTodayStr(now || new Date(), timezone || 'UTC');
  const [currentYearStr, currentMonthStr] = localTodayStr.split('-');
  const currentYear = parseInt(currentYearStr, 10);
  const currentMonth = parseInt(currentMonthStr, 10);

  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const currentMonthPrefix = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
  const prevMonthPrefix = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;

  let currentMonthTotal = 0;
  let previousMonthTotal = 0;

  for (const day of days) {
    if (day && day.date) {
      if (day.date.startsWith(currentMonthPrefix)) {
        currentMonthTotal += day.contributionCount || 0;
      } else if (day.date.startsWith(prevMonthPrefix)) {
        previousMonthTotal += day.contributionCount || 0;
      }
    }
  }

  const expectedPrevMonthStart = `${prevMonthPrefix}-01`;
  const expectedCurrentMonthEnd = localTodayStr;

  let firstDate = '';
  let lastDate = '';
  if (days.length > 0) {
    let minDate = days[0]?.date || '';
    let maxDate = days[0]?.date || '';
    for (const d of days) {
      if (d && d.date) {
        if (!minDate || d.date < minDate) minDate = d.date;
        if (!maxDate || d.date > maxDate) maxDate = d.date;
      }
    }
    firstDate = minDate;
    lastDate = maxDate;
  }

  const hasDays = days.length > 0 && firstDate !== '' && lastDate !== '';
  const isPrevMonthComplete = hasDays && firstDate <= expectedPrevMonthStart;
  const isCurrentMonthComplete = hasDays && lastDate >= expectedCurrentMonthEnd;
  const isCalendarComplete = isPrevMonthComplete && isCurrentMonthComplete;

  const deltaAbsolute = currentMonthTotal - previousMonthTotal;
  const deltaPercentage: number | null =
    !isCalendarComplete || previousMonthTotal === 0
      ? null
      : (() => {
          const pct = Math.round((deltaAbsolute / previousMonthTotal) * 100);
          return pct === -0 ? 0 : pct;
        })();

  return {
    currentMonthTotal,
    previousMonthTotal,
    deltaPercentage,
    deltaAbsolute,
    currentMonthName,
  };
}

export function aggregateCalendars(
  calendars?: ContributionCalendar[] | null
): ContributionCalendar {
  if (!calendars || !Array.isArray(calendars) || calendars.length === 0) {
    return { totalContributions: 0, weeks: [] };
  }

  const totalContributions = calendars.reduce(
    (sum, cal) => sum + (cal?.totalContributions || 0),
    0
  );

  const dateMap = new Map<string, number>();

  for (const cal of calendars) {
    if (!cal?.weeks) continue;

    for (const week of cal.weeks) {
      for (const day of week?.contributionDays || []) {
        if (!day?.date) continue;

        dateMap.set(day.date, (dateMap.get(day.date) || 0) + (day.contributionCount || 0));
      }
    }
  }

  const baseCalendar = calendars.find((c) => c?.weeks?.length)?.weeks
    ? calendars.find((c) => c?.weeks?.length)!
    : calendars[0];

  if (!baseCalendar) {
    return { totalContributions: 0, weeks: [] };
  }

  const result: ContributionCalendar = structuredClone(baseCalendar);
  result.totalContributions = totalContributions;

  const existingDates = new Set<string>();

  for (const week of result.weeks) {
    for (const day of week.contributionDays) {
      if (!day?.date) continue;

      existingDates.add(day.date);

      day.contributionCount = dateMap.get(day.date) ?? 0;
    }
  }

  const missingDays: ContributionDay[] = [];

  for (const [date, count] of dateMap.entries()) {
    if (!existingDates.has(date)) {
      missingDays.push({
        date,
        contributionCount: count,
      } as ContributionDay);
    }
  }

  missingDays.sort((a, b) => a.date.localeCompare(b.date));

  if (missingDays.length > 0) {
    let lastWeek = result.weeks[result.weeks.length - 1];

    for (const day of missingDays) {
      if (!lastWeek || lastWeek.contributionDays.length >= 7) {
        lastWeek = { contributionDays: [] };
        result.weeks.push(lastWeek);
      }

      lastWeek.contributionDays.push(day);
    }
  }

  return result;
}

export function chunkDaysIntoWeeks(
  days?: ContributionDay[] | null,
  hideWeekend: boolean = false
): ContributionCalendar['weeks'] {
  if (!days || !Array.isArray(days) || days.length === 0) {
    return [];
  }

  const validDays = days.filter((day): day is ContributionDay => {
    if (day === null || day === undefined) return false;
    if (!day.date || typeof day.date !== 'string' || day.date.trim() === '') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) return false;
    const dateObj = new Date(day.date);
    return !isNaN(dateObj.getTime());
  });

  if (validDays.length === 0) {
    return [];
  }

  const sorted = [...validDays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let filteredDays = sorted;
  if (hideWeekend) {
    filteredDays = sorted.filter((day) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
  }

  if (filteredDays.length === 0) {
    return [];
  }

  const weeks: ContributionCalendar['weeks'] = [];
  let currentWeek: ContributionDay[] = [];

  for (let i = 0; i < filteredDays.length; i++) {
    const day = filteredDays[i];
    if (!day || !day.date) {
      continue;
    }

    const currentDate = new Date(day.date);
    const currentDayOfWeek = currentDate.getDay();

    if (i === 0) {
      currentWeek.push(day);
      continue;
    }

    const prevDate = new Date(filteredDays[i - 1].date);
    const prevDayOfWeek = prevDate.getDay();

    let isNewWeek = false;

    if (hideWeekend) {
      const dayDiff = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      isNewWeek = dayDiff > 1;
    } else {
      isNewWeek = currentDayOfWeek <= prevDayOfWeek;
    }

    if (isNewWeek) {
      weeks.push({
        contributionDays: currentWeek,
      });
      currentWeek = [];
    }

    currentWeek.push(day);
  }

  if (currentWeek.length > 0) {
    weeks.push({
      contributionDays: currentWeek,
    });
  }

  return weeks;
}

export function calculateWrappedStats(calendar?: ContributionCalendar | null) {
  if (!calendar) {
    return {
      totalContributions: 0,
      mostActiveDate: 'N/A',
      highestDailyCount: 0,
      busiestMonth: 'N/A',
      weekendRatio: 0,
    };
  }

  const weeks = calendar.weeks || [];
  const days = weeks.flatMap((w) => w?.contributionDays || []).filter(Boolean);

  let mostActiveDay = { date: 'N/A', count: 0 };
  const monthCounts: Record<string, number> = {};
  let weekendCommits = 0;
  let weekdayCommits = 0;

  days.forEach((day) => {
    if (!day || !day.date) return;

    const dateObj = new Date(day.date);
    if (isNaN(dateObj.getTime())) {
      return;
    }

    const count = day.contributionCount || 0;
    if (count > mostActiveDay.count) {
      mostActiveDay = { date: day.date, count };
    }

    const month = day.date.substring(0, 7);
    monthCounts[month] = (monthCounts[month] || 0) + count;

    const dayOfWeek = dateObj.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendCommits += count;
    } else {
      weekdayCommits += count;
    }
  });

  const busiestMonthStr =
    Object.keys(monthCounts).length === 0
      ? 'N/A'
      : Object.keys(monthCounts).reduce((a, b) => (monthCounts[a] > monthCounts[b] ? a : b));

  const total = weekendCommits + weekdayCommits;

  return {
    totalContributions: calendar.totalContributions || 0,
    mostActiveDate: mostActiveDay.date,
    highestDailyCount: mostActiveDay.count,
    busiestMonth: busiestMonthStr,
    weekendRatio: calculateSafePercentage(weekendCommits, total),
  };
}

export function normalizeCalendarToTimezone(
  calendar: ContributionCalendar,
  _targetTimezone: string
): ContributionCalendar {
  void _targetTimezone;
  if (!calendar || !calendar.weeks || calendar.weeks.length === 0) {
    return calendar;
  }

  const allDays = calendar.weeks.flatMap((week) => week.contributionDays || []);

  const dateMap = new Map<string, number>();

  for (const day of allDays) {
    if (!day || !day.date) continue;

    const currentCount = dateMap.get(day.date) || 0;
    dateMap.set(day.date, currentCount + (day.contributionCount || 0));
  }

  const sortedDates = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  const weeks: ContributionWeek[] = [];
  let currentWeek: ContributionDay[] = [];

  for (const [date, contributionCount] of sortedDates) {
    const [yearStr, monthStr, dayStr] = date.split('-');
    const dateObj = new Date(
      Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10))
    );
    const dayOfWeek = dateObj.getUTCDay();

    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push({ contributionDays: currentWeek });
      currentWeek = [];
    }

    currentWeek.push({ date, contributionCount });
  }

  if (currentWeek.length > 0) {
    weeks.push({ contributionDays: currentWeek });
  }

  return {
    totalContributions: calendar.totalContributions,
    weeks,
    lastSyncedAt: calendar.lastSyncedAt,
  };
}
