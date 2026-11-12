import { useEffect, useMemo, useState } from 'react'
import { apiBaseUrl, readSession } from '../../auth/session'

/** Organization grants. Org admin and app admin have both without a stored row. */
export const STUDENTS_PERMISSION = 'PERMISSION_STUDENTS'
export const PROBATIONARY_PERMISSION = 'PERMISSION_PROBATIONARY'

const ORG_ADMIN = 'ROLE_EMS_ORG_ADMIN'
const APP_ADMIN = 'ROLE_EMS_APP_ADMIN'

export function isCohortAdmin(session) {
  const roles = session?.roles
  return Array.isArray(roles) && (roles.includes(ORG_ADMIN) || roles.includes(APP_ADMIN))
}

export function hasGrant(permissions, permission) {
  return Array.isArray(permissions) && permissions.includes(permission)
}

export function certificationOf(session) {
  return String(session?.certification ?? '').trim().toUpperCase()
}

/** Admins and the matching grant can open the tab and change it. A matching certification can open it only. */
export function canManageCohort(session, permissions, permission) {
  return isCohortAdmin(session) || hasGrant(permissions, permission)
}

export function canViewCohort(session, permissions, permission) {
  if (canManageCohort(session, permissions, permission)) return true
  const certification = certificationOf(session)
  if (permission === STUDENTS_PERMISSION) return certification === 'STUDENT'
  if (permission === PROBATIONARY_PERMISSION) return certification === 'PROBATIONARY'
  return false
}

export function canOpenCohort(session, permissions, permission) {
  return canViewCohort(session, permissions, permission)
}

export function useCohortAccess() {
  const session = useMemo(() => readSession(), [])
  const admin = isCohortAdmin(session)
  const [permissions, setPermissions] = useState(admin ? [] : null)

  useEffect(() => {
    if (admin) {
      setPermissions([])
      return undefined
    }
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
  }, [admin, session?.accessToken, session?.userId])

  return {
    loading: !admin && permissions === null,
    students: canViewCohort(session, permissions, STUDENTS_PERMISSION),
    probationary: canViewCohort(session, permissions, PROBATIONARY_PERMISSION),
    manageStudents: canManageCohort(session, permissions, STUDENTS_PERMISSION),
    manageProbationary: canManageCohort(session, permissions, PROBATIONARY_PERMISSION),
  }
}
