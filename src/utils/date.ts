/**
 * Local-time date formatting helpers. The original theme used Moment with the
 * site timezone; `toISOString()` would shift dates across UTC midnight, so
 * formatting is done on local components.
 */

const pad = (value: number): string => String(value).padStart(2, '0');

/** `YYYY-MM-DD` in local time. */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `MM-DD` in local time. */
export function formatMonthDay(date: Date): string {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
