import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

/**
 * Safely parse a date value that could be a string, Date object, null, or undefined.
 * Returns null if the value is invalid.
 */
export function safeParseDate(dateValue: string | Date | null | undefined): Date | null {
  if (!dateValue) return null;
  
  try {
    let date: Date;
    if (typeof dateValue === "string") {
      // Try ISO parsing first, then fallback to Date constructor
      date = parseISO(dateValue);
      if (!isValid(date)) {
        date = new Date(dateValue);
      }
    } else {
      date = dateValue;
    }
    
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Safely format a date as relative time (e.g., "2 days ago").
 * Returns the fallback string if the date is invalid.
 */
export function safeFormatDistanceToNow(
  dateValue: string | Date | null | undefined,
  fallback: string = "Unknown"
): string {
  const date = safeParseDate(dateValue);
  if (!date) return fallback;
  
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return fallback;
  }
}

/**
 * Safely format a date with a custom format string.
 * Returns the fallback string if the date is invalid.
 */
export function safeFormat(
  dateValue: string | Date | null | undefined,
  formatString: string,
  fallback: string = "Unknown"
): string {
  const date = safeParseDate(dateValue);
  if (!date) return fallback;
  
  try {
    return format(date, formatString);
  } catch {
    return fallback;
  }
}

/**
 * Safely format a date for display using toLocaleDateString.
 * Returns the fallback string if the date is invalid.
 */
export function safeLocaleDateString(
  dateValue: string | Date | null | undefined,
  locale: string = "en-US",
  options?: Intl.DateTimeFormatOptions,
  fallback: string = "Unknown"
): string {
  const date = safeParseDate(dateValue);
  if (!date) return fallback;
  
  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return fallback;
  }
}
