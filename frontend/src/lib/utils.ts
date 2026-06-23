import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a backend timestamp into a Date.
 *
 * The backend stores timestamps via SQLite `datetime('now')`, which produces
 * UTC values formatted as "YYYY-MM-DD HH:MM:SS" with no timezone marker.
 * `new Date()` would interpret that as *local* time, so the raw UTC numbers
 * would render unconverted (the "I see UTC times" bug). We normalise the
 * string to explicit UTC so the browser can render it in the viewer's timezone.
 */
export function parseTimestamp(ts?: string | null): Date {
  if (!ts) return new Date(NaN)
  // Trust strings that already carry timezone info (Z or ±hh:mm offset).
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(ts)
  let s = ts.includes("T") ? ts : ts.replace(" ", "T")
  if (!hasTz) s += "Z"
  return new Date(s)
}

/** Format a backend UTC timestamp as a date in the browser's local timezone. */
export function formatDate(
  ts?: string | null,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = parseTimestamp(ts)
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, opts)
}

/** Format a backend UTC timestamp as a time in the browser's local timezone. */
export function formatTime(
  ts?: string | null,
  opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
): string {
  const d = parseTimestamp(ts)
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], opts)
}
