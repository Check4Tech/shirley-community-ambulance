import { useMemo, useState } from 'react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTHLY_THURSDAYS = [
  { nth: 1, title: 'Board Meeting' },
  { nth: 2, title: 'General Meeting' },
  { nth: 4, title: 'Training' },
]

const TIME_LABEL = '1930'

function nyYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year').value)
  const month = Number(parts.find((part) => part.type === 'month').value)
  return { year, monthIndex: month - 1 }
}

/** Day of month for the nth Thursday (1-based) in a civil month. */
export function nthThursdayDay(year, monthIndex, nth) {
  const firstDow = new Date(year, monthIndex, 1).getDay()
  const offset = (4 - firstDow + 7) % 7
  return 1 + offset + (nth - 1) * 7
}

function monthLabel(year, monthIndex) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthIndex, 1))
}

function shiftMonth(year, monthIndex, delta) {
  const next = new Date(year, monthIndex + delta, 1)
  return { year: next.getFullYear(), monthIndex: next.getMonth() }
}

function buildMonth(year, monthIndex) {
  const events = MONTHLY_THURSDAYS.map((item) => {
    const day = nthThursdayDay(year, monthIndex, item.nth)
    return { ...item, day, time: TIME_LABEL }
  })
  const byDay = new Map(events.map((event) => [event.day, event]))
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const leading = new Date(year, monthIndex, 1).getDay()
  const cells = []
  for (let i = 0; i < leading; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, event: byDay.get(day) || null })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return { events, cells }
}

export default function MembersCalendar() {
  const initial = nyYearMonth()
  const [cursor, setCursor] = useState(initial)
  const { events, cells } = useMemo(
    () => buildMonth(cursor.year, cursor.monthIndex),
    [cursor.year, cursor.monthIndex],
  )
  const label = monthLabel(cursor.year, cursor.monthIndex)

  return (
    <section className="section members-panel">
      <div className="wrap">
        <header className="members-panel__head">
          <p className="eyebrow">Members calendar</p>
          <h1>{label}</h1>
          <p className="lead">
            Recurring corps nights. The first Thursday is the board meeting, the second
            Thursday is the general meeting, and the fourth Thursday is training. All
            three start at {TIME_LABEL}. There is no third-Thursday event.
          </p>
        </header>

        <div className="month-nav">
          <button
            type="button"
            onClick={() => setCursor((current) => shiftMonth(current.year, current.monthIndex, -1))}
          >
            Previous month
          </button>
          <p className="month-nav__label">{label}</p>
          <button
            type="button"
            onClick={() => setCursor((current) => shiftMonth(current.year, current.monthIndex, 1))}
          >
            Next month
          </button>
        </div>

        <div className="month-grid" role="grid" aria-label={label}>
          {WEEKDAYS.map((name) => (
            <div key={name} className="month-grid__dow" role="columnheader">
              {name}
            </div>
          ))}
          {cells.map((cell, index) =>
            cell ? (
              <div
                key={cell.day}
                role="gridcell"
                className={cell.event ? 'month-grid__day month-grid__day--event' : 'month-grid__day'}
              >
                <span className="month-grid__num">{cell.day}</span>
                {cell.event && (
                  <span className="month-grid__event">
                    {cell.event.title}
                    <span className="month-grid__time">{cell.event.time}</span>
                  </span>
                )}
              </div>
            ) : (
              <div key={`empty-${index}`} className="month-grid__day month-grid__day--empty" />
            ),
          )}
        </div>

        <ol className="month-list">
          {events.map((event) => (
            <li key={event.nth}>
              <span className="month-list__when">
                Thursday, {new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(cursor.year, cursor.monthIndex, event.day))}{' '}
                {event.day}
              </span>
              <span className="month-list__what">{event.title}</span>
              <span className="month-list__time">{event.time}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
