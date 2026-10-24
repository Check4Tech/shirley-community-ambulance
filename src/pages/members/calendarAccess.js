import { useEffect, useMemo, useState } from 'react'
import { apiBaseUrl, readSession } from '../../auth/session'

/** Rows in user_permissions. Organization and app admins can change events without them. Viewing needs no grant. */
export const CALENDAR_CREATE_PERMISSION = 'PERMISSION_CALENDAR_CREATE'
export const CALENDAR_EDIT_PERMISSION = 'PERMISSION_CALENDAR_EDIT'
export const CALENDAR_DELETE_PERMISSION = 'PERMISSION_CALENDAR_DELETE'

const ORG_ADMIN = 'ROLE_EMS_ORG_ADMIN'
const APP_ADMIN = 'ROLE_EMS_APP_ADMIN'

export function isCalendarAdmin(session) {
  const roles = session?.roles
  return Array.isArray(roles) && (roles.includes(ORG_ADMIN) || roles.includes(APP_ADMIN))
}

export function hasCalendarCreatePermission(permissions) {
  return Array.isArray(permissions) && permissions.includes(CALENDAR_CREATE_PERMISSION)
}

/** Org admins and app admins always can. Everyone else needs the matching grant. */
export function canCreateCalendarEvent(session, permissions) {
  return isCalendarAdmin(session) || hasCalendarCreatePermission(permissions)
}

export function canEditCalendarEvent(session, permissions) {
  return isCalendarAdmin(session) || (Array.isArray(permissions) && permissions.includes(CALENDAR_EDIT_PERMISSION))
}

export function canDeleteCalendarEvent(session, permissions) {
  return isCalendarAdmin(session) || (Array.isArray(permissions) && permissions.includes(CALENDAR_DELETE_PERMISSION))
}

export function useCalendarAccess() {
  const session = useMemo(() => readSession(), [])
  const [permissions, setPermissions] = useState(null)

  useEffect(() => {
    const base = apiBaseUrl()
    if (!session?.accessToken || !session?.userId || !base) {
      setPermissions([])
      return undefined
    }
    if (isCalendarAdmin(session)) {
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

  const admin = isCalendarAdmin(session)
  return {
    session,
    loading: !admin && permissions === null,
    canCreate: canCreateCalendarEvent(session, permissions),
    canEdit: canEditCalendarEvent(session, permissions),
    canDelete: canDeleteCalendarEvent(session, permissions),
  }
}
