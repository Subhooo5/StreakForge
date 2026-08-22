export interface DateRange {
  from: string;
  to: string;
}

export function getDefaultDateRange(): DateRange {
  const year = new Date().getUTCFullYear();
  return {
    from: `${year}-01-01T00:00:00Z`,
    to: `${year}-12-31T23:59:59Z`,
  };
}

export const DEFAULT_DATE_RANGE: DateRange = getDefaultDateRange();

export function formatDateRange(year?: string | number | null): DateRange {
  if (year === undefined || year === null) {
    return getDefaultDateRange();
  }

  const trimmedYear = String(year).trim();
  if (trimmedYear === '') {
    return getDefaultDateRange();
  }

  let fullYear: number;
  if (trimmedYear.length === 2) {
    fullYear = parseInt('20' + trimmedYear, 10);
  } else if (trimmedYear.length === 1) {
    fullYear = 2020 + parseInt(trimmedYear, 10);
  } else {
    fullYear = parseInt(trimmedYear, 10);
  }

  const currentYear = new Date().getUTCFullYear();
  const isValidYear = !isNaN(fullYear) && fullYear >= 2008 && fullYear <= currentYear + 5;

  if (!isValidYear) {
    return getDefaultDateRange();
  }

  return {
    from: `${fullYear}-01-01T00:00:00Z`,
    to: `${fullYear}-12-31T23:59:59Z`,
  };
}
