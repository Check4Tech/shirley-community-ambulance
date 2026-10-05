import { useEffect, useState } from 'react'
import { apiBaseUrl, readSession } from '../../auth/session'

/** Row in user_permissions. Creating an amendment requires this grant. */
export const BYLAWS_PERMISSION = 'PERMISSION_BYLAWS'

const ORG_ADMIN = 'ROLE_EMS_ORG_ADMIN'

export function isOrgAdmin(session) {
  return Array.isArray(session?.roles) && session.roles.includes(ORG_ADMIN)
}

export function hasBylawsPermission(permissions) {
  return Array.isArray(permissions) && permissions.includes(BYLAWS_PERMISSION)
}

/**
 * Update and delete when the signed-in session is an organization admin, or
 * the loaded permissions include PERMISSION_BYLAWS. A plain member with neither
 * cannot update or delete.
 */
export function canUpdateOrDeleteBylaw(session, permissions) {
  return isOrgAdmin(session) || hasBylawsPermission(permissions)
}

/**
 * Organization admins and users granted PERMISSION_BYLAWS can open the
 * submissions list and can update or delete an amendment. Creating still
 * requires PERMISSION_BYLAWS on the API.
 */
export function useBylawsAccess() {
  const session = readSession()
  const [permissions, setPermissions] = useState(null)

  useEffect(() => {
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
  }, [session?.accessToken, session?.userId])

  const admin = isOrgAdmin(session)
  const granted = hasBylawsPermission(permissions)
  return {
    loading: permissions === null,
    canUpdateDelete: canUpdateOrDeleteBylaw(session, permissions),
    canViewSubmissions: admin || granted,
    isOrgAdmin: admin,
  }
}
