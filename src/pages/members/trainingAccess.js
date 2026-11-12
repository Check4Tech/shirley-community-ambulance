import { useEffect, useMemo, useState } from 'react'
import { apiBaseUrl, readSession } from '../../auth/session'

/** One grant, like bylaws. It is not the LOSAP Training row. */
export const TRAINING_PERMISSION = 'PERMISSION_TRAINING'

const ORG_ADMIN = 'ROLE_EMS_ORG_ADMIN'
const APP_ADMIN = 'ROLE_EMS_APP_ADMIN'

export function isTrainingAdmin(session) {
  const roles = session?.roles
  return Array.isArray(roles) && (roles.includes(ORG_ADMIN) || roles.includes(APP_ADMIN))
}

export function canManageTraining(session, permissions) {
  return isTrainingAdmin(session) || (Array.isArray(permissions) && permissions.includes(TRAINING_PERMISSION))
}

export function useTrainingAccess() {
  const session = useMemo(() => readSession(), [])
  const [permissions, setPermissions] = useState(null)
  const admin = isTrainingAdmin(session)

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
    canManage: canManageTraining(session, permissions),
  }
}
