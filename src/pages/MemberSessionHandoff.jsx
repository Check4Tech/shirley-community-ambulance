import { useEffect } from 'react'

const ALLOWED_NEXT = new Set(['/shirley/user-portal', '/shirley/complete-checks', '/shirley/selected-rig-check'])

/**
 * The members navbar used to stop on this address. Read the requested next
 * path and continue there. The session hash is dropped and never shown.
 */
export default function MemberSessionHandoff() {
  useEffect(() => {
    let next = '/shirley/complete-checks'
    try {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
      const raw = new URLSearchParams(hash).get('session')
      if (raw) {
        const data = JSON.parse(raw)
        if (typeof data?.next === 'string' && ALLOWED_NEXT.has(data.next)) next = data.next
      }
    } catch {
      next = '/shirley/complete-checks'
    }
    window.location.replace(next)
  }, [])

  return (
    <main className="section">
      <p>Opening rig checks…</p>
    </main>
  )
}
