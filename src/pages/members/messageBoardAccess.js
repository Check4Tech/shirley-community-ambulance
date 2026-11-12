import { useEffect, useMemo, useState } from 'react'
import { apiBaseUrl, readSession } from '../../auth/session'

/** Same shape as PERMISSION_CALENDAR_EDIT. The entity token is one word so the permissions screen can store it. */
export const MESSAGE_BOARD_EDIT_PERMISSION = 'PERMISSION_MESSAGEBOARD_EDIT'
export const MESSAGE_BOARD_CREATE_PERMISSION = 'PERMISSION_MESSAGEBOARD_CREATE'

const ORG_ADMIN = 'ROLE_EMS_ORG_ADMIN'
const APP_ADMIN = 'ROLE_EMS_APP_ADMIN'

export function isMessageBoardAdmin(session) {
  const roles = session?.roles
  return Array.isArray(roles) && (roles.includes(ORG_ADMIN) || roles.includes(APP_ADMIN))
}

export function canEditMessageBoard(session, permissions) {
  return isMessageBoardAdmin(session) || (Array.isArray(permissions) && permissions.includes(MESSAGE_BOARD_EDIT_PERMISSION))
}

export function canCreateMessageBoardPost(session, permissions) {
  return (
    canEditMessageBoard(session, permissions) ||
    (Array.isArray(permissions) && permissions.includes(MESSAGE_BOARD_CREATE_PERMISSION))
  )
}

export function useMessageBoardAccess() {
  const session = useMemo(() => readSession(), [])
  const [permissions, setPermissions] = useState(null)
  const admin = isMessageBoardAdmin(session)

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
    loading: !admin && permissions === null,
    canEdit: canEditMessageBoard(session, permissions),
    canCreate: canCreateMessageBoardPost(session, permissions),
  }
}
