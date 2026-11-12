import { useEffect, useMemo, useState } from 'react'
import { apiBaseUrl, readSession } from '../../auth/session'
import { authorizedFetch } from './memberApi'
import { useCaretRestore } from './useCaretRestore'
import { CERTIFICATION_OPTIONS } from './userDetailsOptions'
import { PROBATIONARY_PERMISSION, STUDENTS_PERMISSION } from './cohortAccess'

const CREATE_PERMISSION = 'PERMISSION_USERS_CREATE'
const MANAGE_ROLES = ['ROLE_EMS_ORG_ADMIN', 'ROLE_EMS_APP_ADMIN', 'ROLE_EMS_SUPERVISOR']
const USER_ROLE = 'ROLE_EMS_USER'
const ORG_ADMIN = 'ROLE_EMS_ORG_ADMIN'
const SUPERVISOR_ROLE = 'ROLE_EMS_SUPERVISOR'

function canAddStudent(session, permissions) {
  const roles = Array.isArray(session?.roles) ? session.roles : []
  if (roles.some((role) => MANAGE_ROLES.includes(role))) return true
  return roles.includes(USER_ROLE) && Array.isArray(permissions) && permissions.includes(CREATE_PERMISSION)
}

function blankDraft(certification) {
  return {
    firstName: '',
    lastName: '',
    email: '',
    emtNumbers: '',
    memberId: '',
    certification,
    role: 'User',
    isPaid: false,
  }
}

function upperText(value) {
  return String(value ?? '').trim().toUpperCase()
}

/** First initial plus last name. A taken name gets a number, the same way registration does. */
function shirleyUsername(firstName, lastName, existing) {
  const base = `${String(firstName).trim().charAt(0)}${String(lastName).trim()}`
  const taken = new Set((existing || []).map((name) => String(name).trim().toLowerCase()).filter(Boolean))
  if (!taken.has(base.toLowerCase())) return base
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = `${base}${Math.floor(Math.random() * 1000)}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
  return `${base}${Date.now()}`
}

export default function AddStudent({ onAdded, certification = 'STUDENT', general = false }) {
  const session = useMemo(() => readSession(), [])
  const roles = Array.isArray(session?.roles) ? session.roles : []
  const manages = roles.some((role) => MANAGE_ROLES.includes(role))
  const orgAdmin = roles.includes(ORG_ADMIN)
  const appAdmin = roles.includes('ROLE_EMS_APP_ADMIN')
  const cohortAdmin = orgAdmin || appAdmin
  const audiencePermission = String(certification).toUpperCase() === 'PROBATIONARY' ? PROBATIONARY_PERMISSION : STUDENTS_PERMISSION
  const skipPermissionLoad = cohortAdmin || (general && manages)
  const supervisorOnly = roles.includes(SUPERVISOR_ROLE) && !orgAdmin && !appAdmin
  const memberOnly = roles.includes(USER_ROLE) && !manages
  const [permissions, setPermissions] = useState(skipPermissionLoad ? [] : null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => blankDraft(general ? '' : certification))

  useEffect(() => {
    if (general) return
    setDraft((current) => (current.certification === certification ? current : { ...current, certification }))
  }, [certification, general])
  const [forProfit, setForProfit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (skipPermissionLoad) return undefined
    const base = apiBaseUrl()
    if (!session?.accessToken || !session?.userId || !base) {
      setPermissions([])
      return undefined
    }
    let cancelled = false
    async function load() {
      try {
        const response = await fetch(`${base}/user-permissions/${session.userId}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        const body = response.ok ? await response.json() : []
        if (!cancelled) setPermissions(Array.isArray(body) ? body : [])
      } catch {
        if (!cancelled) setPermissions([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [skipPermissionLoad, session?.accessToken, session?.userId])

  const allowed = general
    ? canAddStudent(session, permissions)
    : cohortAdmin || (Array.isArray(permissions) && permissions.includes(audiencePermission))
  const rememberCaret = useCaretRestore()

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    async function loadOrganization() {
      try {
        const { response } = await authorizedFetch(session, '/organization')
        if (!response.ok) return
        const body = await response.json()
        if (cancelled) return
        const paid = Boolean(body?.isForProfit)
        setForProfit(paid)
        setDraft((current) => (
          current.employeeChosen
            ? current
            : { ...current, isPaid: supervisorOnly ? true : memberOnly ? false : paid }
        ))
      } catch {
        // Volunteer stays the default for a non-profit squad.
      }
    }
    loadOrganization()
    return () => {
      cancelled = true
    }
  }, [open, session, supervisorOnly, memberOnly])

  if (!allowed) return null

  function update(field) {
    return (event) => {
      const input = event.target
      const raw = input.value
      const value = field === 'role' ? raw : String(raw).toUpperCase()
      if (field !== 'role') rememberCaret(input)
      setDraft((current) => ({ ...current, [field]: value }))
    }
  }

  function close() {
    setOpen(false)
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const memberId = upperText(draft.memberId)
    const organizationId = session?.organizationId
    if (organizationId == null) {
      setSaving(false)
      setError('This sign-in has no organization.')
      return
    }
    const submittedCertification = general ? upperText(draft.certification) : certification
    if (general && !submittedCertification) {
      setSaving(false)
      setError('Choose a certification.')
      return
    }
    const student = !general && certification === 'STUDENT'
    const roleName = student ? 'User' : draft.role === 'Admin' ? 'Admin' : draft.role === 'Supervisor' ? 'Supervisor' : 'User'
    const firstName = upperText(draft.firstName)
    const lastName = upperText(draft.lastName)
    try {
      let existing = []
      try {
        const roster = await authorizedFetch(session, '/users/organization')
        if (roster.response.ok) {
          const rows = await roster.response.json()
          existing = Array.isArray(rows) ? rows.map((row) => row?.username) : []
        }
      } catch {
        existing = []
      }
      const { response, message } = await authorizedFetch(session, '/auth/register/user', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          username: upperText(shirleyUsername(firstName, lastName, existing)),
          email: upperText(draft.email),
          certification: submittedCertification,
          emtNumbers: upperText(draft.emtNumbers),
          memberId: memberId ? Number(memberId) : null,
          organizationId,
          role: roleName,
          isActive: true,
          isPaid: student ? false : draft.isPaid === true || draft.isPaid === 'true' || draft.isPaid === 'EMPLOYEE',
        }),
      })
      if (!response.ok) throw new Error(message || 'The member could not be added.')
      setDraft({ ...blankDraft(general ? '' : certification), isPaid: supervisorOnly ? true : memberOnly ? false : forProfit })
      setOpen(false)
      setNotice(general ? 'User added.' : certification === 'STUDENT' ? 'Student added.' : 'Probationary member added.')
      onAdded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The member could not be added.')
    } finally {
      setSaving(false)
    }
  }

  const showRole = general || certification !== 'STUDENT'
  const employeeOptions = [
    ...(memberOnly ? [] : [{ value: 'EMPLOYEE', label: 'EMPLOYEE' }]),
    ...(supervisorOnly ? [] : [{ value: 'VOLUNTEER', label: 'VOLUNTEER' }]),
  ]
  const employeeValue = draft.isPaid === true || draft.isPaid === 'EMPLOYEE' || draft.isPaid === 'true' ? 'EMPLOYEE' : 'VOLUNTEER'

  return (
    <div className="student-add">
      {notice ? (
        <p className="members-panel__empty" role="status">
          {notice}
        </p>
      ) : null}
      <button type="button" className="btn btn--navy btn--sm" onClick={() => setOpen(true)}>
        {general ? 'Add user' : certification === 'STUDENT' ? 'Add student' : 'Add probationary'}
      </button>
      {open ? (
        <div className="calendar-modal" role="presentation" onMouseDown={close}>
          <form
            className="calendar-modal__panel bulletin-modal user-add-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={submit}
          >
            <header className="calendar-modal__head">
              <h2 id="add-user-title">Add User</h2>
              <button type="button" className="calendar-modal__close" aria-label="Close" onClick={close}>
                ×
              </button>
            </header>
            {error ? (
              <p className="members-panel__error" role="alert">
                {error}
              </p>
            ) : null}
            <label htmlFor="firstName">
              First Name
              <input id="firstName" name="firstName" required placeholder="First Name" value={draft.firstName} onChange={update('firstName')} autoComplete="off" />
            </label>
            <label htmlFor="lastName">
              Last Name
              <input id="lastName" name="lastName" required placeholder="Last Name" value={draft.lastName} onChange={update('lastName')} autoComplete="off" />
            </label>
            <label htmlFor="email">
              Email
              <input id="email" name="email" type="email" required placeholder="Email" value={draft.email} onChange={update('email')} autoComplete="off" />
            </label>
            <label htmlFor="emtNumbers">
              EMT Numbers
              <input id="emtNumbers" name="emtNumbers" placeholder="EMT #" value={draft.emtNumbers} onChange={update('emtNumbers')} autoComplete="off" />
            </label>
            <label htmlFor="member-id">
              Member ID
              <input id="member-id" name="member-id" type="number" placeholder="Member Id" value={draft.memberId} onChange={update('memberId')} autoComplete="off" />
            </label>
            {general ? (
              <label htmlFor="certification">
                Certification
                <select id="certification" name="certification" required value={draft.certification} onChange={(event) => setDraft((current) => ({ ...current, certification: event.target.value }))}>
                  <option value="">Certification</option>
                  {CERTIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {showRole ? (
              <label htmlFor="role">
                ROLE
                <select id="role" name="role" required value={draft.role} onChange={update('role')}>
                  <option value="User">USER</option>
                  {orgAdmin ? <option value="Admin">ORG ADMIN</option> : null}
                  {orgAdmin ? <option value="Supervisor">SUPERVISOR</option> : null}
                </select>
              </label>
            ) : null}
            {showRole ? (
              <label htmlFor="isPaid">
                Employee Type
                <select
                  id="isPaid"
                  name="isPaid"
                  value={employeeOptions.some((option) => option.value === employeeValue) ? employeeValue : employeeOptions[0]?.value}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    employeeChosen: true,
                    isPaid: event.target.value === 'EMPLOYEE',
                  }))}
                >
                  {employeeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="btn-row">
              <button type="submit" className="btn btn--navy btn--sm" disabled={saving}>
                {saving ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
