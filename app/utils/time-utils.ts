// time-utils.ts (New file for time-related helper functions)
import { DateTime } from "luxon";

/**
 * Formats a Unix timestamp into "Mon YYYY" format.
 * @param timestamp Unix timestamp in seconds
 */
export function formatMonthYear(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Gets the first and last day of the month specified by the date, in milliseconds.
 */
export function getMonthRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

/**
 * Gets the first and last day of the previous month, in milliseconds.
 */
export function getPreviousMonthRange(date: Date): {
  start: number;
  end: number;
} {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const end = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

/**
 * Gets the first and last day of the year, in milliseconds.
 */
export function getYearRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

/**
 * Gets the first and last day of the previous year, in milliseconds.
 */
export function getPreviousYearRange(date: Date): {
  start: number;
  end: number;
} {
  const start = new Date(date.getFullYear() - 1, 0, 1);
  const end = new Date(date.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

// offset n unit into the past
export function parseOffset(timeStart: DateTime, offset: string) {
  let value = parseInt(offset.slice(0, -1), 10);
  let unit = offset.slice(-1);

  switch (unit) {
    case "y":
      return timeStart.minus({ years: value });
    case "m":
      return timeStart.minus({ months: value });
    case "d":
      return timeStart.minus({ days: value });
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}
