/** America/New_York members calendar recurrence. Display time stays 24-hour compact, like 1930. */

export const NY_TIME_ZONE = 'America/New_York'

/** Mobile members layout. Wider than this, upcoming events sit beside the grid. */
export const CALENDAR_NARROW_QUERY = '(max-width: 720px)'

export const USER_RECURRENCE = ['ONCE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ANNUALLY']

export const RECURRENCE_LABELS = {
  ONCE: 'One time',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every two weeks',
  MONTHLY: 'Monthly',
  ANNUALLY: 'Annually',
  MONTHLY_NTH_WEEKDAY: 'Monthly weekday',
  ANNUAL_NTH_WEEKDAY: 'Annual weekday',
}

const INTERVAL_DAYS = {
  DAILY: 1,
  WEEKLY: 7,
  BIWEEKLY: 14,
}

export function nthWeekdayOfMonth(year, monthIndex, nth, weekday) {
  const firstDow = new Date(year, monthIndex, 1).getDay()
  const offset = (weekday - firstDow + 7) % 7
  return 1 + offset + (nth - 1) * 7
}

/** Thursday whose date falls on the 8th–14th. That is the second Thursday. */
export function secondWeekThursday(year, monthIndex) {
  return nthWeekdayOfMonth(year, monthIndex, 2, 4)
}

/** @deprecated Use nthWeekdayOfMonth. Kept for the original calendar helper name. */
export function nthThursdayDay(year, monthIndex, nth) {
  return nthWeekdayOfMonth(year, monthIndex, nth, 4)
}

export function parseEventTime(value) {
  if (Array.isArray(value)) {
    return { hour: Number(value[0]) || 0, minute: Number(value[1]) || 0 }
  }
  if (value && typeof value === 'object') {
    const hour = Number(value.hour)
    const minute = Number(value.minute)
    if (Number.isFinite(hour) && Number.isFinite(minute)) return { hour, minute }
  }
  const text = String(value ?? '').trim()
  const clock = /^(\d{1,2}):(\d{2})/.exec(text)
  if (clock) return { hour: Number(clock[1]), minute: Number(clock[2]) }
  const compact = /^(\d{2})(\d{2})$/.exec(text)
  if (compact) return { hour: Number(compact[1]), minute: Number(compact[2]) }
  return { hour: 19, minute: 30 }
}

export function formatEventTime(value) {
  const { hour, minute } = parseEventTime(value)
  return `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}`
}

export function nyDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NY_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const read = (type) => Number(parts.find((part) => part.type === type)?.value)
  let hour = read('hour')
  if (hour === 24) hour = 0
  return { year: read('year'), month: read('month'), day: read('day'), hour, minute: read('minute') }
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function addDays(date, days) {
  const next = new Date(date.year, date.month - 1, date.day + days)
  return { year: next.getFullYear(), month: next.getMonth() + 1, day: next.getDate() }
}

function daysBetween(start, end) {
  const utcStart = Date.UTC(start.year, start.month - 1, start.day)
  const utcEnd = Date.UTC(end.year, end.month - 1, end.day)
  return Math.round((utcEnd - utcStart) / 86400000)
}

function addMonthsCivil(year, month, day, months) {
  const index = month - 1 + months
  const targetYear = year + Math.floor(index / 12)
  const targetMonthIndex = ((index % 12) + 12) % 12
  const dim = daysInMonth(targetYear, targetMonthIndex + 1)
  return {
    year: targetYear,
    month: targetMonthIndex + 1,
    day: Math.min(day, dim),
  }
}

function stamp(value) {
  return value.year * 100000000
    + value.month * 1000000
    + value.day * 10000
    + value.hour * 100
    + value.minute
}

/** Inclusive window from now through the same clock time one month ahead. Upcoming list only. */
export function visibleWindow(now = new Date()) {
  const start = nyDateTime(now)
  const endDate = addMonthsCivil(start.year, start.month, start.day, 1)
  return {
    start,
    end: { ...endDate, hour: start.hour, minute: start.minute },
  }
}

/**
 * The full civil month on screen, including days whose start time has passed
 * and months that are entirely in the past. The upcoming list uses
 * visibleWindow instead, which still starts at now.
 */
export function monthGridWindow(year, monthIndex) {
  const month = monthIndex + 1
  const monthStart = { year, month, day: 1, hour: 0, minute: 0 }
  const monthEnd = { year, month, day: daysInMonth(year, month), hour: 23, minute: 59 }
  return { start: monthStart, end: monthEnd }
}

function parseIsoDate(value) {
  if (Array.isArray(value) && value.length >= 3) {
    const year = Number(value[0])
    const month = Number(value[1])
    const day = Number(value[2])
    if (year && month && day) return { year, month, day }
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

function isoWeekdayToJs(iso) {
  const value = Number(iso)
  if (value === 7) return 0
  if (value >= 0 && value <= 6) return value
  return 4
}

function formatWhen(year, month, day) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function isoDate(date) {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

function toOccurrence(series, date, time) {
  return {
    seriesId: series.id,
    sourceDate: isoDate(date),
    title: series.title,
    year: date.year,
    month: date.month,
    day: date.day,
    hour: time.hour,
    minute: time.minute,
    timeLabel: formatEventTime(time),
    whenLabel: formatWhen(date.year, date.month, date.day),
  }
}

function inWindow(occurrence, window, anchor) {
  const value = stamp(occurrence)
  if (value < stamp(window.start) || value > stamp(window.end)) return false
  if (anchor && value < stamp(anchor)) return false
  return true
}

function pushIfVisible(items, series, date, time, window, anchor) {
  const occurrence = toOccurrence(series, date, time)
  if (inWindow(occurrence, window, anchor)) items.push(occurrence)
}

function expandInterval(series, window, anchor, intervalDays, time) {
  const items = []
  let cursor = { year: anchor.year, month: anchor.month, day: anchor.day }
  const startDate = { year: window.start.year, month: window.start.month, day: window.start.day }
  if (daysBetween(cursor, startDate) > 0) {
    const steps = Math.floor(daysBetween(cursor, startDate) / intervalDays)
    cursor = addDays(cursor, steps * intervalDays)
  }
  for (let i = 0; i < 500; i += 1) {
    const occurrence = toOccurrence(series, cursor, time)
    if (stamp(occurrence) > stamp(window.end)) break
    if (inWindow(occurrence, window, anchor)) items.push(occurrence)
    cursor = addDays(cursor, intervalDays)
  }
  return items
}

function expandMonthly(series, window, anchor, time) {
  const items = []
  let year = anchor.year
  let month = anchor.month
  if (window.start.year > year || (window.start.year === year && window.start.month > month)) {
    year = window.start.year
    month = window.start.month
  }
  for (let i = 0; i < 18; i += 1) {
    if (year > window.end.year || (year === window.end.year && month > window.end.month)) break
    if (anchor.day <= daysInMonth(year, month)) {
      pushIfVisible(items, series, { year, month, day: anchor.day }, time, window, anchor)
    }
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return items
}

function expandAnnually(series, window, anchor, time) {
  const items = []
  for (let year = window.start.year; year <= window.end.year; year += 1) {
    if (year < anchor.year) continue
    const dim = daysInMonth(year, anchor.month)
    if (anchor.day > dim) continue
    pushIfVisible(items, series, { year, month: anchor.month, day: anchor.day }, time, window, anchor)
  }
  return items
}

function expandNthWeekday(series, window, anchor, time, everyMonth) {
  const items = []
  const weekday = isoWeekdayToJs(series.dayOfWeek)
  const week = Number(series.weekOfMonth) || 1
  let year = window.start.year
  let month = everyMonth ? window.start.month : Number(series.monthOfYear)
  const endYear = window.end.year
  if (!everyMonth && (!month || month < 1 || month > 12)) return items

  if (everyMonth) {
    for (let i = 0; i < 4; i += 1) {
      const day = nthWeekdayOfMonth(year, month - 1, week, weekday)
      if (day >= 1 && day <= daysInMonth(year, month)) {
        pushIfVisible(items, series, { year, month, day }, time, window, anchor)
      }
      if (year === endYear && month === window.end.month) break
      month += 1
      if (month > 12) {
        month = 1
        year += 1
      }
    }
    return items
  }

  for (let yearCursor = window.start.year; yearCursor <= endYear; yearCursor += 1) {
    const day = nthWeekdayOfMonth(yearCursor, month - 1, week, weekday)
    if (day < 1 || day > daysInMonth(yearCursor, month)) continue
    pushIfVisible(items, series, { year: yearCursor, month, day }, time, window, anchor)
  }
  return items
}

export function expandSeries(series, window) {
  return applyExceptions(series, expandRule(series, window), window)
}

function expandRule(series, window) {
  const time = parseEventTime(series.eventTime)
  const anchorDate = parseIsoDate(series.eventDate)
  const anchor = anchorDate ? { ...anchorDate, hour: time.hour, minute: time.minute } : null
  const recurrence = series.recurrence

  if (recurrence === 'ONCE') {
    if (!anchor) return []
    const occurrence = toOccurrence(series, anchorDate, time)
    return inWindow(occurrence, window, null) ? [occurrence] : []
  }
  if (INTERVAL_DAYS[recurrence]) {
    if (!anchor) return []
    return expandInterval(series, window, anchor, INTERVAL_DAYS[recurrence], time)
  }
  if (recurrence === 'MONTHLY') {
    if (!anchor) return []
    return expandMonthly(series, window, anchor, time)
  }
  if (recurrence === 'ANNUALLY') {
    if (!anchor) return []
    return expandAnnually(series, window, anchor, time)
  }
  if (recurrence === 'ANNUAL_NTH_WEEKDAY') {
    return expandNthWeekday(series, window, anchor, time, false)
  }
  if (recurrence === 'MONTHLY_NTH_WEEKDAY') {
    return expandNthWeekday(series, window, anchor, time, true)
  }
  return []
}

function normalizeIsoDate(value) {
  if (Array.isArray(value) && value.length >= 3) {
    const year = Number(value[0])
    const month = Number(value[1])
    const day = Number(value[2])
    if (!year || !month || !day) return ''
    return isoDate({ year, month, day })
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? '').trim())
  return match ? match[1] : ''
}

function exceptionMaps(series) {
  const skipped = new Set()
  const overrides = new Map()
  const list = Array.isArray(series?.exceptions) ? series.exceptions : []
  list.forEach((item) => {
    const date = normalizeIsoDate(item?.date)
    if (!date) return
    if (item.action === 'SKIP') {
      skipped.add(date)
      overrides.delete(date)
      return
    }
    if (item.action === 'OVERRIDE' && !skipped.has(date)) overrides.set(date, item)
  })
  return { skipped, overrides }
}

/** True when the series rule produces this date, on or after the anchor. */
function occursOn(series, iso) {
  const date = parseIsoDate(iso)
  const anchor = parseIsoDate(series?.eventDate)
  if (!date || !anchor || daysBetween(anchor, date) < 0) return false
  const recurrence = series.recurrence
  if (recurrence === 'DAILY') return true
  if (recurrence === 'WEEKLY') return daysBetween(anchor, date) % 7 === 0
  if (recurrence === 'BIWEEKLY') return daysBetween(anchor, date) % 14 === 0
  if (recurrence === 'MONTHLY') return date.day === anchor.day
  if (recurrence === 'ANNUALLY') return date.month === anchor.month && date.day === anchor.day
  if (recurrence === 'MONTHLY_NTH_WEEKDAY' || recurrence === 'ANNUAL_NTH_WEEKDAY') {
    if (recurrence === 'ANNUAL_NTH_WEEKDAY' && date.month !== Number(series.monthOfYear)) return false
    const weekday = isoWeekdayToJs(series.dayOfWeek)
    const week = Number(series.weekOfMonth) || 0
    if (week < 1) return false
    const day = nthWeekdayOfMonth(date.year, date.month - 1, week, weekday)
    return day === date.day && day <= daysInMonth(date.year, date.month)
  }
  return false
}

function overrideOccurrence(series, sourceDate, override) {
  const shown = parseIsoDate(override?.eventDate) || parseIsoDate(sourceDate)
  if (!shown) return null
  const time = override?.eventTime != null && override.eventTime !== ''
    ? parseEventTime(override.eventTime)
    : parseEventTime(series.eventTime)
  const title = typeof override?.title === 'string' && override.title.trim()
    ? override.title.trim()
    : series.title
  const occurrence = toOccurrence({ ...series, title }, shown, time)
  occurrence.sourceDate = sourceDate
  return occurrence
}

/**
 * SKIP hides that generated date. OVERRIDE shows the stored name, date, and time
 * instead, including when the replacement date is the one on screen and the
 * generated date is not.
 */
function applyExceptions(series, items, window) {
  const { skipped, overrides } = exceptionMaps(series)
  if (skipped.size === 0 && overrides.size === 0) return items
  const seen = new Set()
  const result = []
  items.forEach((item) => {
    const source = item.sourceDate
    seen.add(source)
    if (skipped.has(source)) return
    const override = overrides.get(source)
    if (!override) {
      result.push(item)
      return
    }
    const replaced = overrideOccurrence(series, source, override)
    if (replaced && inWindow(replaced, window, null)) result.push(replaced)
  })
  overrides.forEach((override, source) => {
    if (seen.has(source) || skipped.has(source) || !occursOn(series, source)) return
    const replaced = overrideOccurrence(series, source, override)
    if (replaced && inWindow(replaced, window, null)) result.push(replaced)
  })
  return result
}

export function expandAll(seriesList, now = new Date(), window = visibleWindow(now)) {
  if (stamp(window.start) > stamp(window.end)) return []
  const items = seriesList.flatMap((series) => expandSeries(series, window))
  items.sort((a, b) => stamp(a) - stamp(b) || a.title.localeCompare(b.title))
  return items
}

export function seriesFromApi(row) {
  return {
    id: row.id,
    seriesKey: row.seriesKey,
    title: row.title,
    recurrence: row.recurrence,
    eventDate: row.eventDate,
    eventTime: row.eventTime,
    monthOfYear: row.monthOfYear,
    weekOfMonth: row.weekOfMonth,
    dayOfWeek: row.dayOfWeek,
    exceptions: Array.isArray(row.exceptions) ? row.exceptions : [],
  }
}

export function monthLabel(year, monthIndex) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthIndex, 1))
}

export function shiftMonth(year, monthIndex, delta) {
  const next = new Date(year, monthIndex + delta, 1)
  return { year: next.getFullYear(), monthIndex: next.getMonth() }
}

/** Same month, a different year. No lower or upper year limit. */
export function shiftYear(year, monthIndex, delta) {
  return { year: year + delta, monthIndex }
}
