/** Call statistics roll over at 00:00 America/New_York on January 1. */
export const CALL_STATS_TIME_ZONE = 'America/New_York'

/**
 * Calendar year shown for call statistics.
 * Before January 1 00:00 in America/New_York the previous year stays up.
 * At that instant, and after it, the new year is shown.
 */
export function callStatsYear(instant = new Date()) {
  const date = instant instanceof Date ? instant : new Date(instant)
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('callStatsYear expected a valid date')
  }

  const yearPart = new Intl.DateTimeFormat('en-US', {
    timeZone: CALL_STATS_TIME_ZONE,
    year: 'numeric',
  })
    .formatToParts(date)
    .find((part) => part.type === 'year')

  const year = Number(yearPart?.value)
  if (!Number.isInteger(year)) {
    throw new Error('Could not resolve the call-stats year')
  }
  return year
}

/**
 * Stand-in monthly counts until a calls API exists.
 * The same pattern is used for whichever year `callStatsYear` resolves.
 */
export const DUMMY_MONTHLY_CALLS = [
  { month: 'January', count: 15 },
  { month: 'February', count: 8 },
  { month: 'March', count: 22 },
  { month: 'April', count: 11 },
  { month: 'May', count: 19 },
  { month: 'June', count: 6 },
  { month: 'July', count: 27 },
  { month: 'August', count: 14 },
  { month: 'September', count: 9 },
  { month: 'October', count: 18 },
  { month: 'November', count: 12 },
  { month: 'December', count: 21 },
]

export function callStatsForInstant(instant = new Date()) {
  return {
    year: callStatsYear(instant),
    months: DUMMY_MONTHLY_CALLS,
  }
}
