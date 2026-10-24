import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import Loader from '../../components/Loader'
import { readSession } from '../../auth/session'
import { authorizedFetch } from './memberApi'
import { MEMBER_STATUSES, memberStatusLabel, memberStatusLocksOut, memberStatusValue } from './memberStatus'
import MembersUserPermissions from './MembersUserPermissions'
import { BOARD_POSITIONS } from '../../data/boardPositions'
import { CERTIFICATION_OPTIONS, COUNTRIES, LANGUAGES, LICENSE_TYPES, STATES } from './userDetailsOptions'
import { readUserDetailsId, writeUserDetailsId } from './userDetailsSelection'
import './user-details.css'

const ROLE_USER = 'ROLE_EMS_USER'
const ROLE_ORG_ADMIN = 'ROLE_EMS_ORG_ADMIN'
const ROLE_SUPERVISOR = 'ROLE_EMS_SUPERVISOR'
const ROLE_APP_ADMIN = 'ROLE_EMS_APP_ADMIN'
const ROLE_KIOSK = 'ROLE_EMS_KIOSK'
const EDIT_ROLES = [ROLE_ORG_ADMIN, ROLE_APP_ADMIN, ROLE_SUPERVISOR]

function roleName(user) {
  if (typeof user?.role === 'string' && user.role.trim()) return user.role.trim()
  const first = Array.isArray(user?.roles) ? user.roles[0] : null
  if (!first) return ''
  return typeof first === 'string' ? first : first.name || ''
}

function wireRole(name) {
  const role = String(name || '')
  if (role === 'ROLE_USER' || role === ROLE_USER) return ROLE_USER
  if (role === 'ROLE_ORG_ADMIN' || role === ROLE_ORG_ADMIN) return ROLE_ORG_ADMIN
  if (role === 'ROLE_SUPERVISOR' || role === ROLE_SUPERVISOR) return ROLE_SUPERVISOR
  if (role === 'ROLE_APP_ADMIN' || role === ROLE_APP_ADMIN) return ROLE_APP_ADMIN
  if (role === 'ROLE_KIOSK' || role === ROLE_KIOSK) return ROLE_KIOSK
  return role
}

function roleLabel(role) {
  if (role === ROLE_ORG_ADMIN) return 'Admin'
  if (role === ROLE_SUPERVISOR) return 'Supervisor'
  if (role === ROLE_KIOSK) return 'Kiosk'
  if (role === ROLE_APP_ADMIN) return 'App admin'
  return 'User'
}

function dateInput(value) {
  if (value == null || value === '') return ''
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  const text = String(value)
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : ''
}

function displayName(user) {
  const parts = [user?.firstName, user?.lastName].filter((part) => typeof part === 'string' && part.trim())
  if (parts.length) return parts.join(' ')
  if (typeof user?.fullName === 'string' && user.fullName.trim()) return user.fullName.trim()
  return user?.username || 'User'
}

function daysUntil(value) {
  const text = dateInput(value)
  if (!text) return null
  const today = new Date()
  const date = new Date(`${text}T00:00:00`)
  return (date.getTime() - today.getTime()) / (1000 * 3600 * 24)
}

function fitClass(value) {
  const days = daysUntil(value)
  if (days == null) return ''
  if (days < 30) return 'highlight-red'
  if (days <= 90) return 'highlight-yellow'
  return ''
}

function licenseClass(value) {
  const text = dateInput(value)
  if (!text) return ''
  const today = new Date()
  const date = new Date(`${text}T00:00:00`)
  const months = (date.getFullYear() - today.getFullYear()) * 12 + (date.getMonth() - today.getMonth())
  if (months < 6) return 'highlight-red'
  if (months <= 12) return 'highlight-yellow'
  return ''
}

function drugClass(value) {
  if (!value) return ''
  return String(value).toLowerCase().includes('pass') ? 'highlight-green' : 'highlight-red'
}

function formatPhone(value) {
  const input = String(value || '').replace(/\D/g, '').slice(0, 10)
  if (input.length > 6) return `${input.slice(0, 3)}-${input.slice(3, 6)}-${input.slice(6)}`
  if (input.length > 3) return `${input.slice(0, 3)}-${input.slice(3)}`
  return input
}

function draftFrom(data) {
  const { password: _password, ...rest } = data
  return {
    ...rest,
    role: wireRole(roleName(rest)),
    memberStatus: memberStatusValue(rest) || 'ACTIVE',
    startDate: dateInput(rest.startDate),
    fitTesting: dateInput(rest.fitTesting),
    licenseExpiration: dateInput(rest.licenseExpiration),
    dateOfBirth: dateInput(rest.dateOfBirth),
    drugTestDate: dateInput(rest.drugTestDate),
    drugTest: rest.drugTest || '',
    emergencyContacts: rest.emergencyContacts && typeof rest.emergencyContacts === 'object' ? { ...rest.emergencyContacts } : {},
    certificates: rest.certificates && typeof rest.certificates === 'object' ? { ...rest.certificates } : {},
    isPaid: Boolean(rest.isPaid),
    certification: rest.certification || '',
    foreignLanguage: rest.foreignLanguage || '',
    sex: rest.sex || '',
    licenseType: rest.licenseType || '',
    state: rest.state || '',
    citizenship: rest.citizenship || '',
    boardPosition: typeof rest.boardPosition === 'string' ? rest.boardPosition : '',
  }
}

function accruedText(accrued) {
  if (!accrued) return '—'
  const years = Number(accrued.years) || 0
  const months = Number(accrued.months) || 0
  const days = Number(accrued.days) || 0
  const parts = [`${years} ${years === 1 ? 'year' : 'years'}`]
  if (months) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`)
  if (days) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  return parts.join(', ')
}

function copyPeriods(list) {
  return list.map((period) => ({ ...period }))
}

const LIFE_YEARS = 10
const PRESTIGIOUS_YEARS = 20
const LEAVE_STATUSES = new Set([
  'INACTIVE',
  'INACTIVE_LIFE',
  'CLINICAL',
  'STUDENT_LEAVE',
  'SUSPENDED',
  'EXPELLED',
  'PERSONAL_LEAVE',
  'MEDICAL_LEAVE',
])

function calendarDate(value) {
  const text = dateInput(value)
  if (!text) return null
  const [year, month, day] = text.split('-').map(Number)
  if (!year || !month || !day) return null
  return { y: year, m: month, d: day }
}

function todayDate() {
  const now = new Date()
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function daysBetween(start, end) {
  const from = Date.UTC(start.y, start.m - 1, start.d)
  const to = Date.UTC(end.y, end.m - 1, end.d)
  return Math.round((to - from) / 86400000)
}

function plusMonths(date, months) {
  const index = date.y * 12 + (date.m - 1) + months
  const year = Math.floor(index / 12)
  const month = index - year * 12 + 1
  return { y: year, m: month, d: Math.min(date.d, daysInMonth(year, month)) }
}

function plusDays(date, days) {
  const shifted = new Date(Date.UTC(date.y, date.m - 1, date.d + days))
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() }
}

function plusPeriod(date, period) {
  return plusDays(plusMonths(date, period.years * 12 + period.months), period.days)
}

/** Same calendar split as Java Period.between. The end date is exclusive. */
function periodBetween(start, end) {
  let totalMonths = end.y * 12 + (end.m - 1) - (start.y * 12 + (start.m - 1))
  let days = end.d - start.d
  if (totalMonths > 0 && days < 0) {
    totalMonths -= 1
    days = daysBetween(plusMonths(start, totalMonths), end)
  } else if (totalMonths < 0 && days > 0) {
    totalMonths += 1
    days -= daysInMonth(end.y, end.m)
  }
  return { years: Math.trunc(totalMonths / 12), months: totalMonths % 12, days }
}

function accrualOrigin(user) {
  return calendarDate(user?.startDate) || calendarDate(user?.createdAt) || todayDate()
}

function countedStart(start, origin) {
  if (!start) return null
  return daysBetween(start, origin) > 0 ? origin : start
}

function countedEnd(end, today) {
  return end || today
}

function spanCounts(start, end) {
  return start && end && daysBetween(start, end) > 0
}

function statusKey(period) {
  return String(period?.memberStatus || '')
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_')
}

function computeHistoryFigures(user, periods, today = todayDate()) {
  const origin = accrualOrigin(user)
  const employee = Boolean(user?.isPaid)
  let cursor = origin
  let leaveDays = 0
  periods.forEach((period) => {
    const status = statusKey(period)
    const start = countedStart(calendarDate(period.startDate), origin)
    const end = countedEnd(calendarDate(period.endDate), today)
    if (!spanCounts(start, end)) return
    if (status === 'ACTIVE') cursor = plusPeriod(cursor, periodBetween(start, end))
    if (LEAVE_STATUSES.has(status)) leaveDays += daysBetween(start, end)
  })
  const accrued = periodBetween(origin, cursor)
  const remaining = (years) => {
    if (accrued.years >= years) return 0
    return Math.max(0, daysBetween(plusPeriod(origin, accrued), plusMonths(origin, years * 12)))
  }
  return {
    daysRemainingForLife: employee ? null : remaining(LIFE_YEARS),
    daysRemainingForPrestigious: employee ? null : remaining(PRESTIGIOUS_YEARS),
    totalDaysOnLeave: leaveDays,
    accrued,
  }
}

function serverField(body, names) {
  if (!body || Array.isArray(body)) return undefined
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(body, name)) return body[name]
  }
  return undefined
}

function readHistory(body, user) {
  const list = Array.isArray(body) ? body : Array.isArray(body?.periods) ? body.periods : []
  const periods = list.map((period) => ({
    id: period?.id ?? null,
    memberStatus: period?.memberStatus || '',
    label: period?.label || '',
    startDate: dateInput(period?.startDate),
    endDate: dateInput(period?.endDate),
  }))
  const accrued =
    body && !Array.isArray(body) && (body.accruedYears != null || body.accruedMonths != null || body.accruedDays != null)
      ? { years: body.accruedYears, months: body.accruedMonths, days: body.accruedDays }
      : null
  const computed = computeHistoryFigures(user, periods)
  const life = serverField(body, ['daysRemainingForLife'])
  const prestigious = serverField(body, ['daysRemainingForPrestigious'])
  const leave = serverField(body, ['totalDaysOnLeave', 'totalLeaveDays'])
  const figures = {
    daysRemainingForLife: life !== undefined ? life : computed.daysRemainingForLife,
    daysRemainingForPrestigious: prestigious !== undefined ? prestigious : computed.daysRemainingForPrestigious,
    totalDaysOnLeave: leave !== undefined ? leave : computed.totalDaysOnLeave,
  }
  return { periods, accrued, figures }
}

function dayFigure(value) {
  if (value == null || value === '') return '—'
  const days = Number(value)
  return Number.isFinite(days) ? String(days) : '—'
}

function samePeriods(left, right) {
  if (left.length !== right.length) return false
  return left.every((period, index) => {
    const other = right[index]
    return (
      period.id === other.id &&
      period.memberStatus === other.memberStatus &&
      dateInput(period.startDate) === dateInput(other.startDate) &&
      dateInput(period.endDate) === dateInput(other.endDate)
    )
  })
}

/** Only rows whose dates changed, and ids the editor removed. Omitted rows are not deletions. */
function periodChanges(current, baseline) {
  const baselineById = new Map(baseline.filter((period) => period.id != null).map((period) => [period.id, period]))
  const currentIds = new Set(current.filter((period) => period.id != null).map((period) => period.id))
  const deleteIds = baseline.filter((period) => period.id != null && !currentIds.has(period.id)).map((period) => period.id)
  const periods = []
  current.forEach((period) => {
    if (period.id == null) return
    const previous = baselineById.get(period.id)
    if (!previous) return
    const startDate = dateInput(period.startDate)
    const endDate = dateInput(period.endDate)
    if (dateInput(previous.startDate) === startDate && dateInput(previous.endDate) === endDate) return
    periods.push({ id: period.id, startDate: startDate || null, endDate: endDate || null })
  })
  return { periods, deleteIds }
}

function dateEditError(changes) {
  for (const period of changes.periods) {
    if (!period.startDate) return 'Start date is required.'
    if (period.endDate && period.startDate >= period.endDate) return 'Start date must be before the end date.'
  }
  return ''
}

function mergeHistory(serverPeriods, editedPeriods, baseline) {
  const changes = periodChanges(editedPeriods, baseline)
  const deleted = new Set(changes.deleteIds)
  const edits = new Map(changes.periods.map((period) => [period.id, period]))
  return serverPeriods
    .filter((period) => period.id == null || !deleted.has(period.id))
    .map((period) => {
      const edit = edits.get(period.id)
      if (!edit) return { ...period }
      return { ...period, startDate: edit.startDate || '', endDate: edit.endDate || '' }
    })
}

function payloadOf(user) {
  const status = user.memberStatus || 'ACTIVE'
  const certificates = {}
  Object.entries(user.certificates || {}).forEach(([name, details]) => {
    certificates[name] = {
      expirationDate: dateInput(details?.expirationDate) || null,
      imgName: details?.imgName || '',
    }
  })
  return {
    memberId: user.memberId === '' || user.memberId == null ? 0 : Number(user.memberId),
    startDate: user.startDate || null,
    firstName: user.firstName ?? '',
    middleName: user.middleName ?? '',
    lastName: user.lastName ?? '',
    username: user.username ?? '',
    email: user.email ?? '',
    certification: user.certification || null,
    emtNumbers: user.emtNumbers == null ? '' : String(user.emtNumbers),
    fitTesting: user.fitTesting || null,
    dateOfBirth: user.dateOfBirth || null,
    licenseExpiration: user.licenseExpiration || null,
    licenseType: user.licenseType ?? '',
    foreignLanguage: user.foreignLanguage ?? '',
    phoneNumber: user.phoneNumber ?? '',
    emergencyContacts: user.emergencyContacts || {},
    sex: user.sex ?? '',
    address: user.address ?? '',
    city: user.city ?? '',
    state: user.state ?? '',
    zipCode: user.zipCode ?? '',
    citizenship: user.citizenship ?? '',
    role: user.role || '',
    memberStatus: status,
    isActive: !memberStatusLocksOut(status),
    isPaid: Boolean(user.isPaid),
    drugTest: String(user.drugTest || '').trim() ? user.drugTest : null,
    drugTestDate: user.drugTestDate || null,
    boardPosition: String(user.boardPosition || '').trim() || null,
    certificates,
  }
}

function UserDetailsScreen() {
  const location = useLocation()
  const userId = readUserDetailsId()
  const backTo =
    typeof location.state?.from === 'string' && location.state.from.startsWith('/members/')
      ? location.state.from
      : '/members/roster'
  const [phase, setPhase] = useState(userId ? 'loading' : 'missing')
  const [user, setUser] = useState(null)
  const [original, setOriginal] = useState(null)
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState(location.state?.tab === 'permissions' ? 'permissions' : 'work')
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [viewerPermissions, setViewerPermissions] = useState(null)
  const [adminCount, setAdminCount] = useState(0)
  const [adminLimit, setAdminLimit] = useState(null)
  const [suppliesSubscribed, setSuppliesSubscribed] = useState(false)
  const [periods, setPeriods] = useState([])
  const [originalPeriods, setOriginalPeriods] = useState([])
  const [accrued, setAccrued] = useState(null)
  const [historyFigures, setHistoryFigures] = useState(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [certOpen, setCertOpen] = useState(false)
  const [certName, setCertName] = useState('')
  const [certDate, setCertDate] = useState('')

  useEffect(() => {
    const session = readSession()
    if (!session || !userId) return undefined
    let cancelled = false
    authorizedFetch(session, `/user-permissions/${session.userId}`)
      .then(async ({ response }) => {
        const body = response.ok ? await response.json() : []
        if (!cancelled) setViewerPermissions(Array.isArray(body) ? body : [])
      })
      .catch(() => {
        if (!cancelled) setViewerPermissions([])
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    const session = readSession()
    if (!session || !userId) return undefined
    let cancelled = false

    async function load() {
      try {
        const { response, message } = await authorizedFetch(session, `/users/${userId}`)
        if (cancelled) return
        if (response.status === 404) {
          setPhase('error')
          setError('This member was not found.')
          return
        }
        if (response.status === 403) {
          setPhase('error')
          setError('You do not have access to this member.')
          return
        }
        if (!response.ok) {
          setPhase('error')
          setError(message || `This member could not be loaded (${response.status}).`)
          return
        }
        const next = draftFrom(await response.json())
        setUser(next)
        setOriginal(next)
        setPhase('ready')
        const periodsResponse = await authorizedFetch(readSession() || session, `/users/${userId}/status-periods`)
        if (!cancelled && periodsResponse.response.ok) {
          const history = readHistory(await periodsResponse.response.json(), next)
          setPeriods(copyPeriods(history.periods))
          setOriginalPeriods(copyPeriods(history.periods))
          if (history.accrued) setAccrued(history.accrued)
          setHistoryFigures(history.figures)
        }
      } catch (err) {
        if (cancelled) return
        setPhase('error')
        setError(err instanceof Error ? err.message : 'This member could not be loaded.')
      }
    }

    setPhase('loading')
    setEditing(false)
    setSaved(false)
    setSaveError('')
    setPeriods([])
    setOriginalPeriods([])
    setAccrued(null)
    setHistoryFigures(null)
    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    const session = readSession()
    if (!session || !userId) return undefined
    let cancelled = false
    authorizedFetch(session, '/organization')
      .then(async ({ response }) => {
        if (!response.ok || cancelled) return
        const body = await response.json()
        if (cancelled) return
        setAdminLimit(Number(body?.adminLimit) || 0)
        setSuppliesSubscribed(Boolean(body?.isSuppliesSubscribed))
      })
      .catch(() => {})
    authorizedFetch(session, '/users/active')
      .then(async ({ response }) => {
        if (!response.ok || cancelled) return
        const body = await response.json()
        if (!cancelled && Array.isArray(body)) {
          setAdminCount(body.filter((item) => wireRole(roleName(item)) === ROLE_ORG_ADMIN).length)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userId])

  const session = readSession()
  const roles = Array.isArray(session?.roles) ? session.roles : []
  const canEdit =
    roles.some((role) => EDIT_ROLES.includes(role)) ||
    (Array.isArray(viewerPermissions) && viewerPermissions.includes('PERMISSION_USERS_EDIT'))
  const viewerIsOrgAdmin = roles.includes(ROLE_ORG_ADMIN)
  const viewerIsUser = roles.includes(ROLE_USER) && !roles.some((role) => EDIT_ROLES.includes(role))
  const viewerIsSupervisor = roles.includes(ROLE_SUPERVISOR) && !roles.includes(ROLE_ORG_ADMIN) && !roles.includes(ROLE_APP_ADMIN)

  function setField(name, value) {
    setSaved(false)
    setSaveError('')
    setUser((prev) => (prev ? { ...prev, [name]: value } : prev))
  }

  function onField(event) {
    const { name, value } = event.target
    setField(name, name === 'phoneNumber' ? formatPhone(value) : value)
  }

  function cancelEdit() {
    setUser(original)
    setPeriods(copyPeriods(originalPeriods))
    setEditing(false)
    setSaveError('')
    setSaved(false)
    setContactOpen(false)
    setCertOpen(false)
  }

  function setPeriodDate(id, field, value) {
    setSaved(false)
    setSaveError('')
    setPeriods((prev) => prev.map((period) => (period.id === id ? { ...period, [field]: value } : period)))
  }

  function deletePeriod(id) {
    setSaved(false)
    setSaveError('')
    setPeriods((prev) => prev.filter((period) => period.id !== id))
  }

  async function save(event) {
    event.preventDefault()
    setSaveError('')
    setSaved(false)
    if (!user) return
    if (!String(user.username || '').trim() || !String(user.firstName || '').trim() || !String(user.lastName || '').trim() || !String(user.email || '').trim()) {
      setSaveError('Username, first name, last name, and email are required.')
      return
    }
    const historyChanged = !samePeriods(periods, originalPeriods)
    if (historyChanged && [...periods, ...originalPeriods].some((period) => period.id == null)) {
      setSaveError('Status history could not be saved because a row has no id.')
      return
    }
    const changes = periodChanges(periods, originalPeriods)
    const dateError = dateEditError(changes)
    if (dateError) {
      setSaveError(dateError)
      return
    }
    const current = readSession()
    if (!current) return
    setSaving(true)
    try {
      const { response, message } = await authorizedFetch(current, `/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(payloadOf(user)),
      })
      if (response.status === 403) {
        setSaveError('You do not have permission to edit this member.')
        return
      }
      if (response.status === 409) {
        setSaveError(message || 'Username or email is already taken.')
        return
      }
      if (!response.ok) {
        setSaveError(message || `This member could not be saved (${response.status}).`)
        return
      }
      const next = draftFrom(await response.json())
      setUser(next)
      setOriginal(next)
      const sessionAfter = readSession() || current
      if (changes.periods.length || changes.deleteIds.length) {
        const historyWrite = await authorizedFetch(sessionAfter, `/users/${userId}/status-periods`, {
          method: 'PATCH',
          body: JSON.stringify({ periods: changes.periods, deleteIds: changes.deleteIds }),
        })
        if (!historyWrite.response.ok) {
          setSaveError(historyWrite.message || `Status history could not be saved (${historyWrite.response.status}).`)
          const reload = await authorizedFetch(readSession() || sessionAfter, `/users/${userId}/status-periods`)
          if (reload.response.ok) {
            const serverHistory = readHistory(await reload.response.json(), next)
            setOriginalPeriods(copyPeriods(serverHistory.periods))
            setPeriods(mergeHistory(serverHistory.periods, periods, originalPeriods))
            if (serverHistory.accrued) setAccrued(serverHistory.accrued)
            setHistoryFigures(serverHistory.figures)
          }
          return
        }
        const written = readHistory(await historyWrite.response.json(), next)
        setPeriods(copyPeriods(written.periods))
        setOriginalPeriods(copyPeriods(written.periods))
        if (written.accrued) setAccrued(written.accrued)
        setHistoryFigures(written.figures)
        const reloaded = await authorizedFetch(readSession() || sessionAfter, `/users/${userId}`)
        if (reloaded.response.ok) {
          const refreshed = draftFrom(await reloaded.response.json())
          setUser(refreshed)
          setOriginal(refreshed)
        }
      } else {
        const periodsResponse = await authorizedFetch(sessionAfter, `/users/${userId}/status-periods`)
        if (periodsResponse.response.ok) {
          const history = readHistory(await periodsResponse.response.json(), next)
          setPeriods(copyPeriods(history.periods))
          setOriginalPeriods(copyPeriods(history.periods))
          if (history.accrued) setAccrued(history.accrued)
          setHistoryFigures(history.figures)
        }
      }
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'This member could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function addContact() {
    const name = contactName.trim()
    if (!name) return
    setUser((prev) => ({
      ...prev,
      emergencyContacts: { ...prev.emergencyContacts, [name]: contactPhone },
    }))
    setContactName('')
    setContactPhone('')
    setContactOpen(false)
  }

  function addCertificate() {
    const name = certName.trim()
    if (!name || !certDate) return
    setUser((prev) => ({
      ...prev,
      certificates: {
        ...prev.certificates,
        [name]: { expirationDate: certDate, imgName: prev.certificates?.[name]?.imgName || '' },
      },
    }))
    setCertName('')
    setCertDate('')
    setCertOpen(false)
  }

  if (!userId || phase === 'missing') {
    return (
      <section className="section section--tight user-details">
        <div className="wrap">
          <p className="c4t-fleet-status is-bad">Open a member from the roster to see user details.</p>
          <Link className="user-details__back" to="/members/roster">
            Back to members
          </Link>
        </div>
      </section>
    )
  }

  const inputClass = editing ? 'size editing-input' : 'size invisible-input'
  const showTabs = user?.role !== ROLE_KIOSK
  const statusLabel = memberStatusLabel(user?.memberStatus) || 'Active'
  const certLabel = CERTIFICATION_OPTIONS.find((item) => item.value === user?.certification)?.label || user?.certification || '—'
  const knownCert = CERTIFICATION_OPTIONS.some((item) => item.value === user?.certification)

  return (
    <section className="section section--tight user-details">
      <div className="wrap c4t-people-details">
        <Link className="user-details__back" to={backTo}>
          Back to members
        </Link>
        {phase === 'loading' && <Loader compact label="Loading member…" />}
        {phase === 'error' && <p className="c4t-fleet-status is-bad">{error}</p>}
        {phase === 'ready' && user && (
          <>
            {saveError ? <p className="c4t-fleet-status is-bad">{saveError}</p> : null}
            {saved ? <p className="c4t-fleet-status is-ok">User updated.</p> : null}
            <div className="c4t-board-hello">
              <div>
                <h1>{displayName(user)}</h1>
                <p>{[roleLabel(user.role), user.isPaid ? 'Employee' : 'Volunteer', statusLabel].join(' · ')}</p>
              </div>
            </div>
            <div className="c4t-fleet-stats">
              <div className="c4t-fleet-stat">
                <span>Role</span>
                <strong>{roleLabel(user.role)}</strong>
              </div>
              <div className="c4t-fleet-stat">
                <span>Status</span>
                <strong>{statusLabel}</strong>
              </div>
              <div className="c4t-fleet-stat">
                <span>Certification</span>
                <strong>{certLabel}</strong>
              </div>
              <div className="c4t-fleet-stat">
                <span>Fit testing</span>
                <strong>{dateInput(user.fitTesting) || '—'}</strong>
              </div>
            </div>
            {showTabs ? (
              <div className="c4t-people-tabs">
                {[
                  ['work', 'Work'],
                  ['personal', 'Personal'],
                  ['certifications', 'Certifications'],
                  ['history', 'Status history'],
                  ['permissions', 'Permissions'],
                ].map(([id, label]) => (
                  <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {tab !== 'permissions' ? (
              <form onSubmit={save}>
                <div className="user-information">
                  <div className="info">
                    {tab === 'work' ? (
                      <>
                        <label htmlFor="startDate">
                          Start Date:
                          <input id="startDate" className={inputClass} type="date" name="startDate" value={user.startDate || ''} readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="username">
                          Username:
                          <input id="username" className={inputClass} type="text" name="username" value={user.username || ''} autoComplete="off" readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="email">
                          Email:
                          <input id="email" className={inputClass} type="email" name="email" value={user.email || ''} autoComplete="off" readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="emtNumbers">
                          EMT Numbers:
                          <input id="emtNumbers" className={inputClass} type="text" name="emtNumbers" value={user.emtNumbers ?? ''} autoComplete="off" readOnly={!editing} onChange={onField} />
                        </label>
                        {user.isPaid ? null : (
                          <label htmlFor="yearsAccrued">
                            Years accrued:
                            <input id="yearsAccrued" className={inputClass} readOnly value={accruedText(accrued)} />
                          </label>
                        )}
                        <label htmlFor="memberStatus">
                          Status:
                          {editing ? (
                            <select id="memberStatus" className={inputClass} name="memberStatus" value={user.memberStatus} onChange={onField}>
                              {MEMBER_STATUSES.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input id="memberStatus" className={`${inputClass} ${memberStatusLocksOut(user.memberStatus) ? 'inactive-text' : 'active-text'}`} readOnly value={statusLabel} />
                          )}
                        </label>
                      </>
                    ) : null}
                    {tab === 'personal' ? (
                      <>
                        <label htmlFor="firstName">
                          First Name:
                          <input id="firstName" className={inputClass} name="firstName" value={user.firstName || ''} autoComplete="off" readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="middleName">
                          Middle Name:
                          <input id="middleName" className={inputClass} name="middleName" value={user.middleName || ''} autoComplete="off" readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="lastName">
                          Last Name:
                          <input id="lastName" className={inputClass} name="lastName" value={user.lastName || ''} autoComplete="off" readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="sex">
                          Sex:
                          <select id="sex" className={inputClass} name="sex" value={user.sex || ''} disabled={!editing} onChange={onField}>
                            <option value="">Sex</option>
                            <option value="MALE">MALE</option>
                            <option value="FEMALE">FEMALE</option>
                          </select>
                        </label>
                        <label htmlFor="dateOfBirth">
                          Date of Birth:
                          <input id="dateOfBirth" className={inputClass} type="date" name="dateOfBirth" value={user.dateOfBirth || ''} readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="foreignLanguage">
                          Foreign Language:
                          <select id="foreignLanguage" className={inputClass} name="foreignLanguage" value={user.foreignLanguage || 'en'} disabled={!editing} onChange={onField}>
                            {LANGUAGES.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : null}
                  </div>

                  <div className="info">
                    {tab === 'work' ? (
                      <>
                        <label htmlFor="memberId">
                          Member Id:
                          <input id="memberId" className={inputClass} type="number" name="memberId" value={user.memberId ?? ''} readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="fitTesting">
                          Fit Testing:
                          <input id="fitTesting" className={`${inputClass} ${fitClass(user.fitTesting)}`} type="date" name="fitTesting" value={user.fitTesting || ''} readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="boardPosition">
                          Position:
                          <select
                            id="boardPosition"
                            className={inputClass}
                            name="boardPosition"
                            value={user.boardPosition || ''}
                            disabled={!editing}
                            onChange={onField}
                          >
                            <option value="">No board seat</option>
                            {BOARD_POSITIONS.map((position) => (
                              <option key={position} value={position}>
                                {position}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label htmlFor="role">
                          Role:
                          <select id="role" className={inputClass} name="role" value={user.role || ROLE_USER} disabled={!editing} onChange={onField}>
                            <option value={ROLE_USER}>User</option>
                            {viewerIsOrgAdmin ? (
                              <option value={ROLE_ORG_ADMIN} disabled={adminLimit != null && adminCount >= adminLimit && user.role !== ROLE_ORG_ADMIN}>
                                Admin
                              </option>
                            ) : null}
                            {viewerIsOrgAdmin ? <option value={ROLE_SUPERVISOR}>Supervisor</option> : null}
                            {user.role === ROLE_KIOSK ? <option value={ROLE_KIOSK}>Kiosk</option> : null}
                            {user.role === ROLE_APP_ADMIN ? <option value={ROLE_APP_ADMIN}>App admin</option> : null}
                          </select>
                        </label>
                        <label htmlFor="certification">
                          Certification:
                          <select id="certification" className={inputClass} name="certification" value={user.certification || ''} disabled={!editing} onChange={onField}>
                            <option value="">Certification</option>
                            {!knownCert && user.certification ? <option value={user.certification}>{user.certification}</option> : null}
                            {CERTIFICATION_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label htmlFor="isPaid">
                          Employee Status:
                          <select id="isPaid" className={inputClass} value={user.isPaid ? 'true' : 'false'} disabled={!editing} onChange={(event) => setField('isPaid', event.target.value === 'true')}>
                            {viewerIsUser ? null : <option value="true">Employee</option>}
                            {viewerIsSupervisor ? null : <option value="false">Volunteer</option>}
                          </select>
                        </label>
                      </>
                    ) : null}
                    {tab === 'personal' ? (
                      <>
                        <label htmlFor="address">
                          Address:
                          <input id="address" className={inputClass} name="address" value={user.address || ''} readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="city">
                          City:
                          <input id="city" className={inputClass} name="city" value={user.city || ''} readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="state">
                          State:
                          <select id="state" className={inputClass} name="state" value={user.state || ''} disabled={!editing} onChange={onField}>
                            <option value="">Select State</option>
                            {user.state && !STATES.includes(user.state) ? <option value={user.state}>{user.state}</option> : null}
                            {STATES.map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label htmlFor="zipCode">
                          Zip Code:
                          <input id="zipCode" className={inputClass} name="zipCode" value={user.zipCode || ''} readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="citizenship">
                          Citizenship:
                          <select id="citizenship" className={inputClass} name="citizenship" value={user.citizenship || ''} disabled={!editing} onChange={onField}>
                            <option value="">Select Country</option>
                            {COUNTRIES.map(([value, label]) => (
                              <option key={`${value}-${label}`} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label htmlFor="phoneNumber">
                          Phone #:
                          <input id="phoneNumber" className={inputClass} name="phoneNumber" value={user.phoneNumber || ''} placeholder="123-456-7890" maxLength={12} disabled={!editing} onChange={onField} />
                        </label>
                      </>
                    ) : null}
                  </div>

                  <div className="info">
                    {tab === 'work' ? (
                      <>
                        <label htmlFor="licenseExpiration">
                          License Expiration:
                          <input id="licenseExpiration" className={`${inputClass} ${licenseClass(user.licenseExpiration)}`} type="date" name="licenseExpiration" value={user.licenseExpiration || ''} readOnly={!editing} onChange={onField} />
                        </label>
                        <label htmlFor="licenseType">
                          License Type:
                          <select id="licenseType" className={inputClass} name="licenseType" value={user.licenseType || ''} disabled={!editing} onChange={onField}>
                            <option value="">Select a license type</option>
                            {user.licenseType && !LICENSE_TYPES.includes(user.licenseType) ? <option value={user.licenseType}>{user.licenseType}</option> : null}
                            {LICENSE_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label htmlFor="drugTest">
                          Drug Test:
                          {editing ? (
                            <span className="user-details__pair">
                              <input id="drugTest" className={`${inputClass} ${drugClass(user.drugTest)}`} name="drugTest" value={user.drugTest || ''} onChange={onField} />
                              <input className={inputClass} type="date" name="drugTestDate" value={user.drugTestDate || ''} onChange={onField} aria-label="Drug test date" />
                            </span>
                          ) : (
                            <input id="drugTest" className={`${inputClass} ${drugClass(user.drugTest)}`} readOnly value={user.drugTest ? `${user.drugTest}${user.drugTestDate ? ` on ${user.drugTestDate}` : ''}` : 'Not Tested'} />
                          )}
                        </label>
                      </>
                    ) : null}
                  </div>
                </div>

                {tab === 'personal' ? (
                  <div className="info">
                    <label>Emergency Contacts:</label>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(user.emergencyContacts || {}).map(([name, phone]) => (
                          <tr key={name}>
                            <td>{name}</td>
                            <td>{phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {editing ? (
                      <button type="button" className="c4t-board-cta is-ghost" onClick={() => setContactOpen(true)}>
                        Add Emergency Contact
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {tab === 'certifications' ? (
                  <div className="info">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Expiration Date</th>
                          <th>Image</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(user.certificates || {}).map(([name, details]) => (
                          <tr key={name}>
                            <td>{name}</td>
                            <td>{dateInput(details?.expirationDate) || '—'}</td>
                            <td>{details?.imgName || 'No image'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {editing ? (
                      <button type="button" className="c4t-board-cta is-ghost" onClick={() => setCertOpen(true)}>
                        Add Certification
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {tab === 'history' ? (
                  <div className="info">
                    <label>Status history:</label>
                    <div className="status-history-figures">
                      {user.isPaid ? null : (
                        <>
                          <p>
                            <span>Days remaining for Life status</span> {dayFigure(historyFigures?.daysRemainingForLife)}
                          </p>
                          <p>
                            <span>Days remaining for prestigious status</span> {dayFigure(historyFigures?.daysRemainingForPrestigious)}
                          </p>
                        </>
                      )}
                      <p>
                        <span>Total days on leave</span> {dayFigure(historyFigures?.totalDaysOnLeave)}
                      </p>
                    </div>
                    {editing && periods.length > 0 ? (
                      <p className="status-history-note">Leave the end date empty for the current period.</p>
                    ) : null}
                    {periods.length === 0 ? (
                      <p className="status-history-empty">
                        {editing && originalPeriods.length > 0
                          ? 'All status periods are marked for removal. Cancel restores them.'
                          : 'No status history yet.'}
                      </p>
                    ) : (
                      <div className="user-details__table-scroll">
                        <table className="status-history-table">
                          <thead>
                            <tr>
                              <th>Status</th>
                              <th>Start</th>
                              <th>End</th>
                              {editing ? <th>Delete</th> : null}
                            </tr>
                          </thead>
                          <tbody>
                            {periods.map((period) => {
                              const statusName = period.label || memberStatusLabel(period.memberStatus) || 'Status'
                              return (
                                <tr key={period.id ?? `${period.memberStatus}-${period.startDate}`}>
                                  <td>{statusName}</td>
                                  <td>
                                    {editing ? (
                                      <input
                                        type="date"
                                        aria-label={`${statusName} start`}
                                        value={period.startDate || ''}
                                        onChange={(event) => setPeriodDate(period.id, 'startDate', event.target.value)}
                                      />
                                    ) : (
                                      period.startDate || '—'
                                    )}
                                  </td>
                                  <td>
                                    {editing ? (
                                      <input
                                        type="date"
                                        aria-label={`${statusName} end`}
                                        value={period.endDate || ''}
                                        onChange={(event) => setPeriodDate(period.id, 'endDate', event.target.value)}
                                      />
                                    ) : (
                                      period.endDate || 'Current'
                                    )}
                                  </td>
                                  {editing ? (
                                    <td>
                                      <button type="button" className="c4t-board-cta is-ghost" onClick={() => deletePeriod(period.id)}>
                                        Delete
                                      </button>
                                    </td>
                                  ) : null}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </form>
            ) : (
              <MembersUserPermissions userId={userId} user={user} suppliesSubscribed={suppliesSubscribed} />
            )}

            {canEdit && tab !== 'permissions' ? (
              <div className="c4t-fleet-footer">
                {!editing ? (
                  <button type="button" className="c4t-board-cta" onClick={() => setEditing(true)}>
                    Edit
                  </button>
                ) : (
                  <>
                    <button type="button" className="c4t-board-cta" onClick={save} disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className="c4t-board-cta is-ghost" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      {contactOpen ? (
        <div className="user-details__modal" role="dialog" aria-labelledby="add-contact-title">
          <form
            className="user-details__dialog"
            onSubmit={(event) => {
              event.preventDefault()
              addContact()
            }}
          >
            <h2 id="add-contact-title">Add Emergency Contact</h2>
            <label>
              Name
              <input value={contactName} onChange={(event) => setContactName(event.target.value)} required />
            </label>
            <label>
              Phone
              <input value={contactPhone} onChange={(event) => setContactPhone(formatPhone(event.target.value))} placeholder="123-456-7890" maxLength={12} />
            </label>
            <div className="c4t-fleet-footer">
              <button type="submit" className="c4t-board-cta">Add</button>
              <button type="button" className="c4t-board-cta is-ghost" onClick={() => setContactOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}

      {certOpen ? (
        <div className="user-details__modal" role="dialog" aria-labelledby="add-cert-title">
          <form
            className="user-details__dialog"
            onSubmit={(event) => {
              event.preventDefault()
              addCertificate()
            }}
          >
            <h2 id="add-cert-title">Add Certification</h2>
            <label>
              Certification Name
              <input value={certName} onChange={(event) => setCertName(event.target.value)} required />
            </label>
            <label>
              Expiration
              <input type="date" value={certDate} onChange={(event) => setCertDate(event.target.value)} required />
            </label>
            <div className="c4t-fleet-footer">
              <button type="submit" className="c4t-board-cta">Add</button>
              <button type="button" className="c4t-board-cta is-ghost" onClick={() => setCertOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  )
}

export default function MembersUserDetails() {
  const { userId } = useParams()
  const location = useLocation()
  if (userId) {
    writeUserDetailsId(userId)
    return <Navigate to="/members/user-details" replace state={location.state} />
  }
  return <UserDetailsScreen />
}
