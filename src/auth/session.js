export const SESSION_KEY = 'sca-member-session'

/**
 * Check4Tech page where a member picks a rig check and opens the completion form.
 * That page is `/shirley/complete-checks` (ShirleyUserPortal).
 * `/shirley/user-portal` still renders the same screen, then sends board members
 * (including a normal user) to the org dashboard, so it is not the rig-check page.
 * The form itself is `/shirley/selected-rig-check` and needs a rig check already chosen.
 */
export const RIG_CHECK_ENTRY_PATH = '/shirley/complete-checks'
export const RIG_CHECK_COMPLETION_PATH = '/shirley/selected-rig-check'

// Production sets VITE_APP_SHIRLEY_API_URL to the Shirley Check4Tech API,
// including the /api prefix (for example https://host/api). Local dev proxies
// /api to the server on port 8080.
export function apiBaseUrl() {
  const configured = import.meta.env.VITE_APP_SHIRLEY_API_URL
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().replace(/\/$/, '')
  }
  if (import.meta.env.DEV) return '/api'
  return ''
}

export function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.accessToken || !session?.username) return null
    return session
  } catch {
    return null
  }
}

export function writeSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export async function logoutMember(session) {
  const base = apiBaseUrl()
  sessionStorage.removeItem(SESSION_KEY)
  if (!base || !session?.userId) return
  try {
    await fetch(`${base}/auth/logout/${session.userId}`, {
      method: 'POST',
      headers: session.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : undefined,
    })
  } catch {
    // The browser session is already cleared.
  }
}

/**
 * Check4Tech client origin. The two apps do not share localStorage
 * (redux-persist is encrypted under `persist:root` on the client origin).
 */
export function check4techClientOrigin() {
  const configured = import.meta.env.VITE_APP_CHECK4TECH_CLIENT_URL
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().replace(/\/$/, '')
  }
  // Locally the members site is the server on this port. A hard-coded
  // 127.0.0.1 address often is not listening, so the handoff stays on this origin.
  if (import.meta.env.DEV) return typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin
  return 'https://check4tech.net'
}

/**
 * Opens Check4Tech with this Shirley login written into its Redux session,
 * then continues to the rig-check portal. The token rides in the URL hash
 * so it is not sent to the server; the client page clears the hash immediately.
 */
export function rigCheckHandoffUrl(session) {
  const payload = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken ?? '',
    roles: Array.isArray(session.roles) ? session.roles : [],
    userId: session.userId,
    organizationId: session.organizationId,
    certification: session.certification ?? '',
    isSubscribed: Boolean(session.isSubscribed),
    isNarcSubscribed: Boolean(session.isNarcSubscribed),
    isSuppliesSubscribed: Boolean(session.isSuppliesSubscribed),
    hasDefaultPassword: Boolean(session.hasDefaultPassword),
    organizationKey: 'SHIRLEY',
    username: session.username,
    next: RIG_CHECK_ENTRY_PATH,
  }
  const hash = encodeURIComponent(JSON.stringify(payload))
  return `${check4techClientOrigin()}/shirley/member-session#session=${hash}`
}
