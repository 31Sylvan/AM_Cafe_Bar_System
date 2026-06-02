export type DateRangeFilter = {
  from?: string;
  to?: string;
};

export type StatusFilter<T extends string> = DateRangeFilter & {
  status?: T | "all";
};

export function cleanSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || undefined;
  return value?.trim() || undefined;
}

export function isIsoDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function inDateRange(date: string, filter: DateRangeFilter) {
  if (filter.from && date < filter.from) return false;
  if (filter.to && date > filter.to) return false;
  return true;
}
