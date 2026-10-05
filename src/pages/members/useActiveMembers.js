import { useEffect, useRef, useState } from 'react'
import { apiBaseUrl, readSession, writeSession } from '../../auth/session'

const MIN_SPINNER_MS = 700

function formatRole(role) {
  if (role == null || role === '') return ''
  return String(role)
    .replace(/^ROLE_/, '')
    .replace(/_/g, ' ')
    .trim()
}

export function memberName(member) {
  if (typeof member.fullName === 'string' && member.fullName.trim()) return member.fullName.trim()
  const parts = [member.firstName, member.lastName].filter((part) => typeof part === 'string' && part.trim())
  if (parts.length) return parts.join(' ')
  if (typeof member.username === 'string' && member.username.trim()) return member.username.trim()
  return ''
}

/** Display order: name A–Z, case-insensitive, then username. */
export function compareMembers(a, b) {
  const byName = String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })
  if (byName !== 0) return byName
  return String(a.username ?? '').localeCompare(String(b.username ?? ''), undefined, { sensitivity: 'base' })
}

function membershipText(member) {
  return [member?.role, member?.certification, member?.licenseType]
    .filter((value) => value != null && String(value).trim() !== '')
    .join(' ')
}

/** Student or youth, from role, certification, or license type. */
export function isStudent(member) {
  return /student|youth/i.test(membershipText(member))
}

/** Probationary, from role, certification, or license type. */
export function isProbationary(member) {
  return /probation/i.test(membershipText(member))
}

function memberStatus(member) {
  const value = member?.isActive ?? member?.active
  if (value === true || value === 'true') return 'Active'
  if (value === false || value === 'false') return 'Inactive'
  return ''
}

function mapMembers(data, { sortByName }) {
  const rows = data.map((member) => ({
    id: member.id,
    name: memberName(member),
    username: member.username ?? '',
    role: formatRole(member.role),
    certification: member.certification ?? '',
    email: member.email ?? '',
    phone: member.phoneNumber ?? '',
    status: memberStatus(member),
    raw: member,
  }))
  if (sortByName) rows.sort(compareMembers)
  return rows
}

/**
 * Roster filters that a normal org user (ROLE_EMS_USER or ROLE_EMS_ORG_ADMIN)
 * is allowed to call. GET /users/inactive and GET /users/name are app-admin
 * only and are not used.
 *
 * all        GET /users/organization          unordered — sort A–Z here
 * active     GET /users/active                last name
 * bls        GET /users/active/bls            last name
 * als        GET /users/active/als            last name
 * employees  GET /users/active/employed       first name, last name
 * volunteers GET /users/active/volunteers     first name, last name
 * name       GET /search/active?q=            unordered — sort A–Z here
 *            GET /search/inactive?q=          same, org-scoped, both statuses
 */
export const MEMBER_LIST_FILTERS = [
  { id: 'all', label: 'All members' },
  { id: 'active', label: 'Active' },
  { id: 'bls', label: 'BLS' },
  { id: 'als', label: 'ALS' },
  { id: 'employees', label: 'Employees' },
  { id: 'volunteers', label: 'Volunteers' },
]

const LIST_PATH = {
  all: '/users/organization',
  active: '/users/active',
  bls: '/users/active/bls',
  als: '/users/active/als',
  employees: '/users/active/employed',
  volunteers: '/users/active/volunteers',
}

const BACKEND_ORDER = new Set(['active', 'bls', 'als', 'employees', 'volunteers'])

function listId(list) {
  return Object.prototype.hasOwnProperty.call(LIST_PATH, list) ? list : 'all'
}

function searchPath(kind, query) {
  return `/search/${kind}?q=${encodeURIComponent(query)}`
}

function mergeById(groups) {
  const byId = new Map()
  groups.flat().forEach((user) => {
    const key = user?.id ?? user?.username
    if (key == null || byId.has(key)) return
    byId.set(key, user)
  })
  return [...byId.values()]
}

function intersectInOrder(ordered, matches) {
  const ids = new Set(matches.map((user) => user?.id).filter((id) => id != null))
  return ordered.filter((user) => ids.has(user?.id))
}

async function fetchUserList(session, path) {
  const base = apiBaseUrl()
  if (!base) {
    throw new Error('The members list is not configured.')
  }
  return fetch(`${base}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
  })
}

async function responseMessage(response) {
  try {
    const body = await response.clone().json()
    if (typeof body?.message === 'string' && body.message.trim()) return body.message.trim()
  } catch {
    // Error bodies are not always JSON.
  }
  return ''
}

/**
 * An expired access token is dropped by the API filter, then method security
 * answers 403 with "Access Denied" — the same status as a missing token.
 * That is a dead session, not a role denial.
 */
function sessionRejected(status, message) {
  if (status === 401) return true
  return status === 403 && message === 'Access Denied'
}

function listFailure(status, message) {
  if (status === 401) return 'Your session expired. Sign in again.'
  if (status === 403) return 'You do not have access to the member list.'
  if (message) return message
  return `The member list could not be loaded (${status}).`
}

async function refreshSession(session) {
  const base = apiBaseUrl()
  if (!base || !session?.refreshToken) return null
  let response
  try {
    response = await fetch(`${base}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
  } catch {
    return null
  }
  if (!response.ok) return null
  const data = await response.json()
  if (!data?.accessToken) return null
  const next = {
    ...session,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || session.refreshToken,
  }
  writeSession(next)
  return next
}

async function loadList(session, path) {
  const response = await fetchUserList(session, path)
  const message = await responseMessage(response)
  if (!response.ok) {
    return { members: null, status: response.status, message }
  }
  const data = await response.json()
  if (!Array.isArray(data)) {
    throw new Error('The member list came back in an unexpected shape.')
  }
  return { members: data, status: response.status, message }
}

async function loadPaths(session, paths) {
  let current = session
  let batch = await Promise.all(paths.map((path) => loadList(current, path)))
  const rejected = batch.some((item) => item.members == null && sessionRejected(item.status, item.message))
  if (!rejected) return { session: current, batch }

  const refreshed = await refreshSession(current)
  if (!refreshed) {
    throw new Error('Your session expired. Sign in again.')
  }
  current = refreshed
  batch = await Promise.all(paths.map((path) => loadList(current, path)))
  return { session: current, batch }
}

function firstFailure(batch) {
  const failed = batch.find((item) => item.members == null)
  if (!failed) return null
  return new Error(listFailure(failed.status, failed.message))
}

/**
 * Default roster is every user in the signed-in org. A 403 that survives one
 * session refresh falls back to the active list, which the same roles may call.
 * GET /users/inactive stays unused: it is app-admin and not limited to this org.
 */
async function loadOrganization(session) {
  const { session: current, batch } = await loadPaths(session, ['/users/organization'])
  const organization = batch[0]
  if (organization.members) {
    return { members: mapMembers(organization.members, { sortByName: true }), notice: '' }
  }
  if (organization.status !== 403) {
    throw new Error(listFailure(organization.status, organization.message))
  }

  const active = await loadList(current, '/users/active')
  if (active.members) {
    return {
      members: mapMembers(active.members, { sortByName: false }),
      notice:
        'Inactive members could not be loaded with this sign-in. Status is shown only for the members this account can see.',
    }
  }
  if (active.status === 403) {
    throw new Error('You do not have access to the member list.')
  }
  throw new Error(listFailure(active.status, active.message))
}

async function loadFilteredMembers(session, list, query) {
  const name = query.trim()
  const id = listId(list)
  if (!name && id === 'all') return loadOrganization(session)

  if (!name) {
    const { batch } = await loadPaths(session, [LIST_PATH[id]])
    const failure = firstFailure(batch)
    if (failure) throw failure
    return {
      members: mapMembers(batch[0].members, { sortByName: !BACKEND_ORDER.has(id) }),
      notice: '',
    }
  }

  if (id === 'all') {
    const { batch } = await loadPaths(session, [searchPath('active', name), searchPath('inactive', name)])
    const failure = firstFailure(batch)
    if (failure) throw failure
    return {
      members: mapMembers(mergeById(batch.map((item) => item.members)), { sortByName: true }),
      notice: '',
    }
  }

  if (id === 'active') {
    const { batch } = await loadPaths(session, [searchPath('active', name)])
    const failure = firstFailure(batch)
    if (failure) throw failure
    return { members: mapMembers(batch[0].members, { sortByName: true }), notice: '' }
  }

  const { batch } = await loadPaths(session, [LIST_PATH[id], searchPath('active', name)])
  const failure = firstFailure(batch)
  if (failure) throw failure
  return {
    members: mapMembers(intersectInOrder(batch[0].members, batch[1].members), { sortByName: false }),
    notice: '',
  }
}

export function useActiveMembers({ list = 'all', query = '' } = {}) {
  const [state, setState] = useState({
    status: 'loading',
    members: [],
    error: '',
    notice: '',
    loaded: false,
  })
  const seenLoad = useRef(false)

  useEffect(() => {
    const session = readSession()
    let cancelled = false
    const started = Date.now()
    const holdSpinner = !seenLoad.current

    setState((prev) => ({
      status: 'loading',
      members: [],
      error: '',
      notice: '',
      loaded: prev.loaded,
    }))

    async function run() {
      if (!session) {
        setState((prev) => ({
          status: 'error',
          members: [],
          error: 'Sign in to view members.',
          notice: '',
          loaded: prev.loaded,
        }))
        return
      }
      try {
        const { members, notice } = await loadFilteredMembers(session, list, query)
        if (holdSpinner) {
          const wait = Math.max(0, MIN_SPINNER_MS - (Date.now() - started))
          if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait))
        }
        if (!cancelled) {
          seenLoad.current = true
          setState({ status: 'ready', members, error: '', notice, loaded: true })
        }
      } catch (error) {
        if (holdSpinner) {
          const wait = Math.max(0, MIN_SPINNER_MS - (Date.now() - started))
          if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait))
        }
        const message =
          error instanceof TypeError
            ? 'Could not reach the member list. Check your connection and try again.'
            : error instanceof Error
              ? error.message
              : 'The member list could not be loaded.'
        if (!cancelled) {
          setState((prev) => ({
            status: 'error',
            members: [],
            error: message,
            notice: '',
            loaded: prev.loaded,
          }))
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [list, query])

  return state
}
