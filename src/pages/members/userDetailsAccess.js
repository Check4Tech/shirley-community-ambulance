import { useEffect, useMemo, useState } from 'react'
import { apiBaseUrl, readSession } from '../../auth/session'

export const ROLE_ORG_ADMIN = 'ROLE_EMS_ORG_ADMIN'
export const ROLE_APP_ADMIN = 'ROLE_EMS_APP_ADMIN'

/** Edit on the Users entity. */
export const USERS_EDIT_PERMISSION = 'PERMISSION_USERS_EDIT'

/**
 * Full Access on the Users entity. The permissions screen stores these four
 * grants together; it does not use a separate permission name.
 */
export const FULL_USERS_PERMISSIONS = [
  'PERMISSION_USERS_VIEW',
  'PERMISSION_USERS_CREATE',
  'PERMISSION_USERS_EDIT',
  'PERMISSION_USERS_DELETE',
]

export function isUserDetailsAdmin(session) {
  const roles = Array.isArray(session?.roles) ? session.roles : []
  return roles.includes(ROLE_ORG_ADMIN) || roles.includes(ROLE_APP_ADMIN)
}

export function hasUsersEditPermission(permissions) {
  return Array.isArray(permissions) && permissions.includes(USERS_EDIT_PERMISSION)
}

export function hasFullUsersPermission(permissions) {
  return Array.isArray(permissions) && FULL_USERS_PERMISSIONS.every((permission) => permissions.includes(permission))
}

/** Org admin, app admin, user edit, or full Users access. A person's own id is not enough. */
export function canEditAnyUser(session, permissions) {
  if (isUserDetailsAdmin(session)) return true
  if (!Array.isArray(permissions)) return false
  return hasUsersEditPermission(permissions) || hasFullUsersPermission(permissions)
}

/** Own record, or any member when the viewer can edit users. */
export function canOpenUserDetails(session, targetId, permissions) {
  if (!session || targetId == null || String(targetId) === '') return false
  if (String(session.userId) === String(targetId)) return true
  return canEditAnyUser(session, permissions)
}

export function useViewerPermissions() {
  const session = useMemo(() => readSession(), [])
  const admin = isUserDetailsAdmin(session)
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
    session,
    permissions,
    loading: !admin && permissions === null,
    canEditAny: canEditAnyUser(session, permissions),
  }
}
