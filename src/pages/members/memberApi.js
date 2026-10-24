import { apiBaseUrl, readSession, writeSession } from '../../auth/session'

async function readMessage(response) {
  try {
    const body = await response.clone().json()
    if (typeof body?.message === 'string' && body.message.trim()) return body.message.trim()
  } catch {
    // Error bodies are not always JSON.
  }
  return ''
}

function sessionRejected(status, message) {
  if (status === 401) return true
  return status === 403 && message === 'Access Denied'
}

async function refreshSession(session) {
  const base = apiBaseUrl()
  if (!base || !session?.refreshToken) return null
  try {
    const response = await fetch(`${base}/auth/refresh-token`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
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
  } catch {
    return null
  }
}

export async function authorizedFetch(session, path, options = {}) {
  const base = apiBaseUrl()
  if (!base) throw new Error('The member record is not configured.')
  const send = (current) =>
    fetch(`${base}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${current.accessToken}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })

  let current = session
  let response = await send(current)
  let message = await readMessage(response)
  if (!response.ok && sessionRejected(response.status, message)) {
    const next = await refreshSession(current)
    if (!next) throw new Error('Your session expired. Sign in again.')
    current = next
    response = await send(current)
    message = await readMessage(response)
  }
  return { response, message, session: current }
}
