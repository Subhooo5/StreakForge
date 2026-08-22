export function getSecondsUntilUTCMidnight(): number {
  const now = new Date();

  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  );

  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

export function getSecondsUntilMidnightInTimezone(tz?: string | null): number {
  if (tz === undefined || tz === null || tz.trim() === '') {
    return getSecondsUntilUTCMidnight();
  }

  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

  const hour = get('hour') % 24;
  const minute = get('minute');
  const second = get('second');

  return 86400 - (hour * 3600 + minute * 60 + second);
}
