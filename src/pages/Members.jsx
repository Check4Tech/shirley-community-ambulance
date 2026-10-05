import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { org } from '../data/site'
import { Field } from '../components/UI'
import { apiBaseUrl, readSession, writeSession } from '../auth/session'
import './members.css'

const eyeIcon = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
}

function IconEye() {
  return (
    <svg {...eyeIcon}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg {...eyeIcon}>
      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.2 3.2" />
      <path d="M6.1 6.1A18.6 18.6 0 0 0 2 12s3.5 8 10 8a10.8 10.8 0 0 0 5.4-1.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

async function readErrorMessage(response) {
  try {
    const body = await response.json()
    if (typeof body?.message === 'string' && body.message.trim()) return body.message.trim()
  } catch {
    /* non-JSON error body */
  }
  return ''
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
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [reset, setReset] = useState({ username: '', email: '' })
  const [resetError, setResetError] = useState('')
  const [resetStatus, setResetStatus] = useState('')
  const [resetting, setResetting] = useState(false)

  function updateField(field) {
    return (event) => {
      setError('')
      const raw = event.target.value
      const value = field === 'username' ? raw.toUpperCase().trim() : raw
      setCredentials((prev) => ({ ...prev, [field]: value }))
    }
  }

  function openForgot() {
    setForgotOpen(true)
    setReset((prev) => ({
      username: prev.username || credentials.username,
      email: prev.email,
    }))
  }

  function updateReset(field) {
    return (event) => {
      setResetError('')
      setResetStatus('')
      const raw = event.target.value
      const value = field === 'username' ? raw.toUpperCase().trim() : raw
      setReset((prev) => ({ ...prev, [field]: value }))
    }
  }

  async function handleForgot(event) {
    event.preventDefault()
    setResetError('')
    setResetStatus('')

    const base = apiBaseUrl()
    if (!base) {
      setResetError(`Unable to reset your password. Please contact admin ${org.phone}.`)
      return
    }

    const username = reset.username.trim().toUpperCase()
    const email = reset.email.trim()
    if (!username || !email) {
      setResetError('Enter your username and email.')
      return
    }

    setResetting(true)
    try {
      const response = await fetch(`${base}/auth/forgot-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          organizationKey: credentials.organizationKey,
          username,
          email,
        }),
      })

      if (!response.ok) {
        const message = await readErrorMessage(response)
        setResetError(message || `Something went wrong (${response.status}). Please try again.`)
        return
      }

      setResetStatus(
        'A new password was emailed to you. Sign in with that password, then change it.',
      )
    } catch {
      setResetError('Could not reach password reset. Check your connection and try again.')
    } finally {
      setResetting(false)
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
        roles: Array.isArray(data.roles) ? data.roles : [],
        userId: data.userId,
        organizationId: data.organizationId,
        certification: data.certification ?? '',
        isSubscribed: Boolean(data.isSubscribed),
        isNarcSubscribed: Boolean(data.isNarcSubscribed),
        isSuppliesSubscribed: Boolean(data.isSuppliesSubscribed),
        hasDefaultPassword: Boolean(data.hasDefaultPassword),
      }
      writeSession(nextSession)
      setSession(nextSession)
      setCredentials((prev) => ({ ...prev, password: '' }))
    } catch {
      setError('Could not reach sign-in. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (session) {
    return <Navigate to="/members/home" replace />
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

          <form id="members-login" className="form members__form" onSubmit={handleSubmit}>
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
              <p className="field members__password">
                <label htmlFor="f-password">
                  Password
                  <span className="field__req" aria-hidden="true">
                    *
                  </span>
                </label>
                <span className="members__password-control">
                  <input
                    id="f-password"
                    name="password"
                    type={passwordVisible ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={credentials.password}
                    onChange={updateField('password')}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="members__password-toggle"
                    aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={passwordVisible}
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    disabled={submitting}
                  >
                    {passwordVisible ? <IconEyeOff /> : <IconEye />}
                  </button>
                </span>
              </p>
            </form>
              <p className="members__forgot-row">
                <button
                  type="button"
                  className="members__forgot"
                  aria-expanded={forgotOpen}
                  aria-controls="members-forgot"
                  onClick={openForgot}
                >
                  Forgot password?
                </button>
              </p>
              {forgotOpen && (
                <form id="members-forgot" className="form members__form members__reset" onSubmit={handleForgot}>
                  <p className="members__reset-lead">
                    Enter the username and email on your account. We will email you a new password.
                  </p>
                  <Field
                    label="Username"
                    name="resetUsername"
                    type="text"
                    required
                    autoComplete="username"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={reset.username}
                    onChange={updateReset('username')}
                    disabled={resetting}
                  />
                  <Field
                    label="Email"
                    name="resetEmail"
                    type="email"
                    required
                    autoComplete="email"
                    spellCheck={false}
                    value={reset.email}
                    onChange={updateReset('email')}
                    disabled={resetting}
                  />
                  {resetStatus && (
                    <p className="members__hint" role="status">
                      {resetStatus}
                    </p>
                  )}
                  {resetError && (
                    <p className="members__error" role="alert">
                      {resetError}
                    </p>
                  )}
                  <button type="submit" className="btn btn--navy btn--block" disabled={resetting}>
                    {resetting ? 'Sending…' : 'Email new password'}
                  </button>
                </form>
              )}
              {error && (
                <p className="members__error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" form="members-login" className="btn btn--navy btn--block" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
        </div>
      </div>
    </section>
  )
}
