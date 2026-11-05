import { useEffect, useMemo, useState } from 'react'
import { apiBaseUrl, readSession } from '../../auth/session'

/** Single grant, same shape as PERMISSION_BYLAWS. */
export const FORMS_PERMISSION = 'PERMISSION_FORMS'

const ORG_ADMIN = 'ROLE_EMS_ORG_ADMIN'
const APP_ADMIN = 'ROLE_EMS_APP_ADMIN'

export function isFormAdmin(session) {
  const roles = session?.roles
  return Array.isArray(roles) && (roles.includes(ORG_ADMIN) || roles.includes(APP_ADMIN))
}

/**
 * A forms grant is PERMISSION_FORMS, or an entity grant such as
 * PERMISSION_FORMS_EDIT. Other entities do not count.
 */
export function hasFormsPermission(permissions) {
  if (!Array.isArray(permissions)) return false
  return permissions.some(
    (permission) =>
      typeof permission === 'string' &&
      (permission === FORMS_PERMISSION || permission.startsWith('PERMISSION_FORMS_')),
  )
}

/** Organization and app admins always can. Everyone else needs a forms grant. */
export function canEditPreceptorForm(session, permissions) {
  return isFormAdmin(session) || hasFormsPermission(permissions)
}

export function useFormAccess(enabled = true) {
  const session = useMemo(() => readSession(), [])
  const [permissions, setPermissions] = useState(null)
  const admin = isFormAdmin(session)

  useEffect(() => {
    if (!enabled || admin) {
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
  }, [admin, enabled, session?.accessToken, session?.userId])

  return {
    loading: enabled && !admin && permissions === null,
    canEdit: enabled && canEditPreceptorForm(session, permissions),
  }
}
