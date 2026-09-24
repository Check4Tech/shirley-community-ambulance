import { useState } from 'react'
import { org } from '../data/site'
import { Field } from '../components/UI'
import './members.css'

export default function Members() {
  const [notice, setNotice] = useState(null)
  const [forgotNote, setForgotNote] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    // TODO: wire to Check4Tech Shirley server/client
    setNotice('pending')
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

          {notice ? (
            <div className="members__status" role="status">
              <p>
                The member portal is not connected yet. Check back soon, or call the
                station at <a href={org.phoneHref}>{org.phone}</a>.
              </p>
            </div>
          ) : (
            <form className="form members__form" onSubmit={handleSubmit}>
              <Field label="Email" name="email" type="email" required />
              <Field label="Password" name="password" type="password" required />
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
                  Password reset is not available yet. The member portal is coming —
                  check back soon, or call the station at{' '}
                  <a href={org.phoneHref}>{org.phone}</a>.
                </p>
              )}
              <button type="submit" className="btn btn--navy btn--block">
                Sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
