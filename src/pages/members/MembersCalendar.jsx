import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Field } from '../../components/UI'
import { apiBaseUrl } from '../../auth/session'
import { useCalendarAccess } from './calendarAccess'
import {
  CALENDAR_NARROW_QUERY,
  RECURRENCE_LABELS,
  USER_RECURRENCE,
  expandAll,
  monthGridWindow,
  monthLabel,
  nyDateTime,
  seriesFromApi,
  shiftMonth,
  shiftYear,
} from './calendarEvents'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function useNarrowCalendar() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(CALENDAR_NARROW_QUERY).matches,
  )

  useEffect(() => {
    const query = window.matchMedia(CALENDAR_NARROW_QUERY)
    const onChange = () => setNarrow(query.matches)
    onChange()
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return narrow
}

function dayHeading(year, monthIndex, day) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(year, monthIndex, day))
}

function viewMonthName(year, monthIndex) {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(year, monthIndex, 1))
}

async function readErrorMessage(response) {
  try {
    const body = await response.json()
    if (typeof body?.message === 'string' && body.message.trim()) return body.message.trim()
  } catch {
    /* non-JSON error body */
  }
  return ''
}

function DayEvents({ events }) {
  return events.map((event) => (
    <span key={`${event.seriesId}-${event.day}-${event.title}`} className="month-grid__event">
      {event.title}
      <span className="month-grid__time">{event.timeLabel}</span>
    </span>
  ))
}

function DayModal({ heading, events, onClose }) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="calendar-modal" role="presentation" onClick={onClose}>
      <div
        className="calendar-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="calendar-modal__head">
          <h2 id={titleId}>{heading}</h2>
          <button type="button" className="calendar-modal__close" onClick={onClose}>
            Close
          </button>
        </div>
        {events.length === 0 ? (
          <p className="members-panel__empty">Nothing scheduled.</p>
        ) : (
          <ul className="calendar-modal__list">
            {events.map((event) => (
              <li key={`${event.seriesId}-${event.title}`}>
                <span className="month-list__what">{event.title}</span>
                <span className="month-list__time">{event.timeLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function MembersCalendar() {
  const access = useCalendarAccess()
  const narrow = useNarrowCalendar()
  const initial = nyDateTime()
  const [cursor, setCursor] = useState({ year: initial.year, monthIndex: initial.month - 1 })
  const [yearDraft, setYearDraft] = useState(String(initial.year))
  const [creating, setCreating] = useState(false)
  const [stored, setStored] = useState([])
  const [loadError, setLoadError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('19:30')
  const [recurrence, setRecurrence] = useState('ONCE')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formNotice, setFormNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const createSuccessTimer = useRef(null)

  useEffect(() => () => {
    if (createSuccessTimer.current != null) window.clearTimeout(createSuccessTimer.current)
  }, [])

  function clearCreateSuccessTimer() {
    if (createSuccessTimer.current == null) return
    window.clearTimeout(createSuccessTimer.current)
    createSuccessTimer.current = null
  }

  function showCreateFailure() {
    clearCreateSuccessTimer()
    setFormNotice('')
    setFormError('failed to create event')
  }

  function showCreateSuccess() {
    setFormError('')
    setFormNotice('event created successfully')
    clearCreateSuccessTimer()
    createSuccessTimer.current = window.setTimeout(() => {
      createSuccessTimer.current = null
      setFormNotice('')
    }, 3000)
  }

  useEffect(() => {
    if (!narrow) setSelectedDay(null)
  }, [narrow])

  useEffect(() => {
    setYearDraft(String(cursor.year))
  }, [cursor.year])

  useEffect(() => {
    if (!creating) return
    document.getElementById('f-calendar-title')?.focus()
  }, [creating])

  useEffect(() => {
    const base = apiBaseUrl()
    const session = access.session
    if (!base || !session?.accessToken) {
      setStored([])
      setLoadError('Sign in again to load saved events.')
      return undefined
    }

    let cancelled = false
    async function load() {
      try {
        const response = await fetch(`${base}/members/calendar/events`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (!response.ok) {
          const message = await readErrorMessage(response)
          throw new Error(message || 'Stored events could not be loaded.')
        }
        const body = await response.json()
        if (!cancelled) {
          setStored(Array.isArray(body) ? body.map(seriesFromApi) : [])
          setLoadError('')
        }
      } catch (error) {
        if (!cancelled) {
          setStored([])
          setLoadError(error instanceof Error && error.message ? error.message : 'Stored events could not be loaded.')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [access.session, reloadKey])

  const gridEvents = useMemo(
    () => expandAll(stored, undefined, monthGridWindow(cursor.year, cursor.monthIndex)),
    [stored, cursor.year, cursor.monthIndex],
  )
  const upcoming = useMemo(() => expandAll(stored), [stored])
  const byDay = useMemo(() => {
    const map = new Map()
    gridEvents.forEach((event) => {
      if (event.year !== cursor.year || event.month !== cursor.monthIndex + 1) return
      const list = map.get(event.day) || []
      list.push(event)
      map.set(event.day, list)
    })
    return map
  }, [gridEvents, cursor.year, cursor.monthIndex])

  const cells = useMemo(() => {
    const daysInMonth = new Date(cursor.year, cursor.monthIndex + 1, 0).getDate()
    const leading = new Date(cursor.year, cursor.monthIndex, 1).getDay()
    const result = []
    for (let i = 0; i < leading; i += 1) result.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push({ day, events: byDay.get(day) || [] })
    }
    while (result.length % 7 !== 0) result.push(null)
    return result
  }, [byDay, cursor.year, cursor.monthIndex])

  const label = monthLabel(cursor.year, cursor.monthIndex)
  const selectedEvents = selectedDay ? byDay.get(selectedDay) || [] : []

  function moveMonth(delta) {
    setSelectedDay(null)
    setCursor((current) => shiftMonth(current.year, current.monthIndex, delta))
  }

  function moveYear(delta) {
    setSelectedDay(null)
    setCursor((current) => shiftYear(current.year, current.monthIndex, delta))
  }

  function onYearInput(event) {
    const raw = event.target.value.replace(/\D/g, '').slice(0, 4)
    setYearDraft(raw)
    if (!/^\d{4}$/.test(raw)) return
    setSelectedDay(null)
    setCursor((current) => ({ year: Number(raw), monthIndex: current.monthIndex }))
  }

  function onYearBlur() {
    if (!/^\d{4}$/.test(yearDraft)) setYearDraft(String(cursor.year))
  }

  function onYearKeyDown(event) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.currentTarget.blur()
  }

  function resetCreateForm() {
    setTitle('')
    setEventDate('')
    setEventTime('19:30')
    setRecurrence('ONCE')
    setFormError('')
  }

  function openCreate() {
    clearCreateSuccessTimer()
    setFormNotice('')
    setFormError('')
    setCreating(true)
  }

  function cancelCreate() {
    clearCreateSuccessTimer()
    resetCreateForm()
    setFormNotice('')
    setCreating(false)
  }

  async function handleCreate(event) {
    event.preventDefault()
    clearCreateSuccessTimer()
    setFormError('')
    setFormNotice('')
    const base = apiBaseUrl()
    const session = access.session
    if (!base || !session?.accessToken) {
      showCreateFailure()
      return
    }
    if (!title.trim() || !eventDate || !eventTime) {
      showCreateFailure()
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`${base}/members/calendar/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          eventDate,
          eventTime,
          recurrence,
        }),
      })
      if (!response.ok) {
        showCreateFailure()
        return
      }
      resetCreateForm()
      setCreating(false)
      showCreateSuccess()
      setReloadKey((value) => value + 1)
    } catch {
      showCreateFailure()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="section members-panel members-calendar">
      <div className="wrap">
        <header className="members-panel__head">
          <p className="eyebrow">Members calendar</p>
          <h1>{label}</h1>
          <p className="lead">
            The grid shows every event in the month you are viewing, including ones that already
            started. Upcoming is from now through one month ahead and stays put when you change
            month or year.
          </p>
        </header>

        <p className="calendar-notes">
          Board meeting is the first Thursday, general meeting the second Thursday, and training
          the fourth Thursday. All three are at 1930 every month. Nominations and department
          elections are the Thursday of the second week of November and December.
        </p>

        {access.canCreate && !creating && (
          <p className="calendar-create-toggle">
            <button type="button" className="btn btn--navy btn--sm" onClick={openCreate}>
              Create event
            </button>
          </p>
        )}

        {access.canCreate && creating && (
          <form id="calendar-create" className="calendar-create" onSubmit={handleCreate}>
            <Field
              label="Event name"
              name="calendar-title"
              required
              value={title}
              onChange={(input) => setTitle(input.target.value)}
            />
            <Field
              label="Date"
              name="calendar-date"
              type="date"
              required
              value={eventDate}
              onChange={(input) => setEventDate(input.target.value)}
            />
            <Field
              label="Time"
              name="calendar-time"
              type="time"
              required
              value={eventTime}
              onChange={(input) => setEventTime(input.target.value)}
            />
            <Field
              label="Repeats"
              name="calendar-recurrence"
              required
              value={recurrence}
              onChange={(input) => setRecurrence(input.target.value)}
              options={USER_RECURRENCE.map((value) => ({
                value,
                label: RECURRENCE_LABELS[value],
              }))}
            />
            <p className="calendar-create__actions">
              <button type="submit" className="btn btn--navy" disabled={saving}>
                {saving ? 'Saving…' : 'Save event'}
              </button>
              <button type="button" className="btn btn--outline" onClick={cancelCreate} disabled={saving}>
                Cancel
              </button>
            </p>
            {formError && (
              <p className="calendar-create__notice calendar-create__notice--err" role="alert">
                {formError}
              </p>
            )}
          </form>
        )}

        {formNotice && !creating && (
          <p className="calendar-create__notice calendar-create__notice--ok" role="status">
            {formNotice}
          </p>
        )}

        {loadError && (
          <p className="members-panel__error" role="alert">
            {loadError}
          </p>
        )}

        <div className="month-nav" role="group" aria-label="Month and year">
          <button type="button" className="month-nav__prev" onClick={() => moveMonth(-1)}>
            Previous month
          </button>
          <div className="month-nav__current">
            <p className="month-nav__month">{viewMonthName(cursor.year, cursor.monthIndex)}</p>
            <div className="month-nav__year">
              <label htmlFor="calendar-year">Year</label>
              <button type="button" onClick={() => moveYear(-1)} aria-label="Previous year">
                <span aria-hidden="true">‹</span>
              </button>
              <input
                id="calendar-year"
                value={yearDraft}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={4}
                onChange={onYearInput}
                onBlur={onYearBlur}
                onKeyDown={onYearKeyDown}
              />
              <button type="button" onClick={() => moveYear(1)} aria-label="Next year">
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
          <button type="button" className="month-nav__next" onClick={() => moveMonth(1)}>
            Next month
          </button>
        </div>

        <div className="calendar-layout">
          <div className="month-grid" role="grid" aria-label={label}>
            {WEEKDAYS.map((name) => (
              <div key={name} className="month-grid__dow" role="columnheader">
                {name}
              </div>
            ))}
            {cells.map((cell, index) => {
              if (!cell) {
                return <div key={`empty-${index}`} className="month-grid__day month-grid__day--empty" />
              }
              const className = cell.events.length
                ? 'month-grid__day month-grid__day--event'
                : 'month-grid__day'
              const heading = dayHeading(cursor.year, cursor.monthIndex, cell.day)
              const names = cell.events.map((item) => item.title).join(', ')
              if (narrow) {
                return (
                  <button
                    key={cell.day}
                    type="button"
                    role="gridcell"
                    className={className}
                    aria-label={names ? `${heading}. ${names}` : `${heading}. Nothing scheduled`}
                    onClick={() => setSelectedDay(cell.day)}
                  >
                    <span className="month-grid__num">{cell.day}</span>
                    <DayEvents events={cell.events} />
                  </button>
                )
              }
              return (
                <div key={cell.day} role="gridcell" className={className}>
                  <span className="month-grid__num">{cell.day}</span>
                  <DayEvents events={cell.events} />
                </div>
              )
            })}
          </div>

          {!narrow && (
            <aside className="calendar-upcoming" aria-label="Upcoming events">
              <h2>Upcoming</h2>
              {upcoming.length === 0 ? (
                <p className="members-panel__empty">No upcoming events.</p>
              ) : (
                <ol className="month-list">
                  {upcoming.map((event) => (
                    <li key={`${event.seriesId}-${event.year}-${event.month}-${event.day}-${event.title}`}>
                      <span className="month-list__when">{event.whenLabel}</span>
                      <span className="month-list__what">{event.title}</span>
                      <span className="month-list__time">{event.timeLabel}</span>
                    </li>
                  ))}
                </ol>
              )}
            </aside>
          )}
        </div>

        {narrow && selectedDay != null && (
          <DayModal
            heading={dayHeading(cursor.year, cursor.monthIndex, selectedDay)}
            events={selectedEvents}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </div>
    </section>
  )
}
