import { useState } from 'react'
import { org } from '../../data/site'
import { apiBaseUrl } from '../../auth/session'

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

async function readBody(response) {
  const text = await response.text()
  if (!text) return ''
  try {
    const body = JSON.parse(text)
    if (typeof body?.message === 'string' && body.message.trim()) return body.message.trim()
  } catch {
    // The credentials endpoint returns a plain sentence.
  }
  return text.trim()
}

function SecretField({ id, label, value, onChange, shown, onToggle, autoComplete, inputMode, minLength, maxLength }) {
  return (
    <p className="field members__password">
      <label htmlFor={id}>
        {label}
        <span className="field__req" aria-hidden="true">
          *
        </span>
      </label>
      <span className="members__password-control">
        <input
          id={id}
          name={id}
          type={shown ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          inputMode={inputMode}
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
        />
        <button type="button" className="members__password-toggle" aria-label={shown ? `Hide ${label}` : `Show ${label}`} aria-pressed={shown} onClick={onToggle}>
          {shown ? <IconEyeOff /> : <IconEye />}
        </button>
      </span>
    </p>
  )
}

export default function UpdateCredentialsPrompt({ session, onUpdated }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [shown, setShown] = useState({ password: false, confirmPassword: false, pin: false, confirmPin: false })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(field) {
    setShown((current) => ({ ...current, [field]: !current[field] }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmPassword || newPin !== confirmPin) {
      setError('Password and Confirm Password, or PIN and Confirm PIN do not match.')
      return
    }
    if (!newPassword || !confirmPassword || !newPin || !confirmPin) {
      setError('Input fields cannot be blank.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (newPassword.toLowerCase() === 'welcome1') {
      setError('You cannot reuse the default password.')
      return
    }
    if (newPin.length < 4 || newPin.length > 6) {
      setError('PIN must be 4 to 6 characters long.')
      return
    }
    const base = apiBaseUrl()
    if (!base || session?.userId == null) {
      setError('Could not update your password and PIN.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(`${base}/users/${session.userId}/credentials`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ newPassword, newPin }),
      })
      if (!response.ok) {
        const message = await readBody(response)
        throw new Error(message || 'Please enter a valid password and PIN.')
      }
      setSuccess('Credentials updated successfully!')
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please enter a valid password and PIN.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="members">
      <div className="wrap members__wrap">
        <div className="members__card members__card--credentials" role="dialog" aria-modal="true" aria-labelledby="credentials-title">
          <img src="/images/shield.png" alt="" width="110" height="110" className="members__emblem" />
          <p className="members__org">{org.name}</p>
          <h1 id="credentials-title" className="members__title">
            Password & PIN
          </h1>
          <form className="form members__form" onSubmit={submit}>
            <p className="members__reset-lead">Please update your password (minimum of 8 characters) and PIN (4–6 characters).</p>
            {error ? (
              <p className="members__error" role="alert">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="members__status" role="status">
                {success}
              </p>
            ) : null}
            <SecretField
              id="new-password"
              label="New Password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              shown={shown.password}
              onToggle={() => toggle('password')}
              autoComplete="new-password"
              minLength={8}
            />
            <SecretField
              id="confirm-password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              shown={shown.confirmPassword}
              onToggle={() => toggle('confirmPassword')}
              autoComplete="new-password"
              minLength={8}
            />
            <SecretField
              id="new-pin"
              label="New PIN"
              value={newPin}
              onChange={(event) => setNewPin(event.target.value)}
              shown={shown.pin}
              onToggle={() => toggle('pin')}
              autoComplete="off"
              inputMode="numeric"
              minLength={4}
              maxLength={6}
            />
            <SecretField
              id="confirm-pin"
              label="Confirm PIN"
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value)}
              shown={shown.confirmPin}
              onToggle={() => toggle('confirmPin')}
              autoComplete="off"
              inputMode="numeric"
              minLength={4}
              maxLength={6}
            />
            <button type="submit" className="btn btn--navy btn--block" disabled={saving}>
              {saving ? 'Updating...' : 'Update Password and PIN'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
