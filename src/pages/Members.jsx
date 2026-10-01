import { useState } from 'react'
import { org } from '../data/site'
import { Field } from '../components/UI'
import './members.css'

const SESSION_KEY = 'sca-member-session'

// Production sets VITE_APP_SHIRLEY_API_URL to the Shirley Check4Tech API,
// including the /api prefix (for example https://host/api). Local dev proxies
// /api to the server on port 8080.
function apiBaseUrl() {
  const configured = import.meta.env.VITE_APP_SHIRLEY_API_URL
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().replace(/\/$/, '')
  }
  if (import.meta.env.DEV) return '/api'
  return ''
}

function readSession() {
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

export default function Members() {
  // Organization key stays on this object and is never shown. Members only
  // type a username and password.
  const [credentials, setCredentials] = useState({
    organizationKey: 'SHIRLEY',
    username: '',
    password: '',
  })
  const [session, setSession] = useState(readSession)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [forgotNote, setForgotNote] = useState(false)

  function updateField(field) {
    return (event) => {
      setError('')
      const raw = event.target.value
      const value = field === 'username' ? raw.toUpperCase().trim() : raw
      setCredentials((prev) => ({ ...prev, [field]: value }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const base = apiBaseUrl()
    if (!base) {
      setError(`Unable to sign in. Please contact admin ${org.phone}.`)
      return
    }

    const payload = {
      organizationKey: credentials.organizationKey,
      username: credentials.username.trim(),
      password: credentials.password,
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        if (response.status === 401) {
          let inactive = false
          try {
            const body = await response.json()
            inactive = typeof body?.message === 'string' && /inactive/i.test(body.message)
          } catch {
            inactive = false
          }
          setError(inactive ? 'This account is inactive.' : 'Incorrect username or password.')
        } else {
          setError(`Something went wrong (${response.status}). Please try again.`)
        }
        return
      }

      const data = await response.json()
      if (!data?.accessToken || !data?.username) {
        setError(`Something went wrong (${response.status}). Please try again.`)
        return
      }

      const nextSession = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        username: data.username,
        roles: data.roles,
        userId: data.userId,
        organizationId: data.organizationId,
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
      setCredentials((prev) => ({ ...prev, password: '' }))
    } catch {
      setError('Could not reach sign-in. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function signOut() {
    const current = session
    const base = apiBaseUrl()
    setSession(null)
    sessionStorage.removeItem(SESSION_KEY)
    setCredentials((prev) => ({ ...prev, username: '', password: '' }))

    if (!base || !current?.userId) return
    try {
      await fetch(`${base}/auth/logout/${current.userId}`, {
        method: 'POST',
        headers: current.accessToken
          ? { Authorization: `Bearer ${current.accessToken}` }
          : undefined,
      })
    } catch {
      // The browser session is already cleared.
    }
  }

  return (
    <section className="members">
      <div className="wrap members__wrap">
        <div className="members__card">
          <img
            src="/images/shield.png"
            alt=""
            width="110"
            height="110"
            className="members__emblem"
          />
          <p className="members__org">{org.name}</p>
          <h1 className="members__title">Members login</h1>

          {session ? (
            <div className="members__signed-in">
              <p className="members__status" role="status">
                Signed in as <strong>{session.username}</strong>.
              </p>
              <button type="button" className="btn btn--navy btn--block" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : (
            <form className="form members__form" onSubmit={handleSubmit}>
              <Field
                label="Username"
                name="username"
                type="text"
                required
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                value={credentials.username}
                onChange={updateField('username')}
                disabled={submitting}
              />
              <Field
                label="Password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={credentials.password}
                onChange={updateField('password')}
                disabled={submitting}
              />
              <p className="members__forgot-row">
                <button
                  type="button"
                  className="members__forgot"
                  onClick={() => setForgotNote(true)}
                >
                  Forgot password?
                </button>
              </p>
              {forgotNote && (
                <p className="members__hint" role="status">
                  Password reset is not available on this page yet. Call the station at{' '}
                  <a href={org.phoneHref}>{org.phone}</a>.
                </p>
              )}
              {error && (
                <p className="members__error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn--navy btn--block" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
