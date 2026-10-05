import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Loader from '../../components/Loader'
import { apiBaseUrl, readSession } from '../../auth/session'
import { useBylawsAccess } from './bylawAccess'

function blank(value) {
  if (value == null) return ''
  return String(value).trim()
}

function textOrDash(value) {
  const text = blank(value)
  return text || '—'
}

function dateLabel(value) {
  const text = blank(value)
  if (!text) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (!match) return text
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return text
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function submitterLabel(row) {
  const name = blank(row?.submittedByName)
  const username = blank(row?.submittedByUsername)
  if (name && username && name.toLowerCase() !== username.toLowerCase()) {
    return `${name} (${username})`
  }
  return name || username || '—'
}

function snippet(row) {
  const change = blank(row?.changeToRead)
  const reads = blank(row?.reads)
  const source = change || reads
  if (!source) return null
  const flat = source.replace(/\s+/g, ' ')
  const text = flat.length <= 160 ? flat : `${flat.slice(0, 157).trimEnd()}…`
  return { label: change ? 'Change' : 'Reads', text }
}

function compareSubmissions(a, b) {
  const submitted = blank(b?.dateSubmitted).localeCompare(blank(a?.dateSubmitted))
  if (submitted !== 0) return submitted
  return (Number(b?.id) || 0) - (Number(a?.id) || 0)
}

function BylawSubmissionList({ canUpdateDelete }) {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const session = readSession()
    const base = apiBaseUrl()
    if (!session?.accessToken || !base) {
      setStatus('error')
      setError('Bylaw submissions could not be loaded.')
      return undefined
    }

    let cancelled = false
    async function load() {
      try {
        const response = await fetch(`${base}/forms/bylaw`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (cancelled) return
        if (!response.ok) {
          let detail = ''
          try {
            const body = await response.json()
            detail = typeof body?.message === 'string' ? body.message.trim() : ''
          } catch {
            detail = ''
          }
          setStatus('error')
          setError(
            detail
              ? `Bylaw submissions could not be loaded (${response.status}). ${detail}`
              : `Bylaw submissions could not be loaded (${response.status}).`,
          )
          return
        }
        const body = await response.json()
        if (cancelled) return
        if (!Array.isArray(body)) {
          setStatus('error')
          setError('Bylaw submissions could not be loaded.')
          return
        }
        setRows([...body].sort(compareSubmissions))
        setStatus('ready')
      } catch {
        if (cancelled) return
        setStatus('error')
        setError('Bylaw submissions could not be loaded.')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function remove(row) {
    const label = submitterLabel(row)
    if (!window.confirm(`Delete the bylaw amendment from ${label}? This cannot be undone.`)) return
    const session = readSession()
    const base = apiBaseUrl()
    if (!session?.accessToken || !base || row?.id == null) {
      setError('This bylaw amendment could not be deleted.')
      return
    }
    setDeletingId(row.id)
    setError('')
    try {
      const response = await fetch(`${base}/forms/bylaw/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (response.status === 403) {
        setError('You do not have permission to delete this bylaw amendment.')
        return
      }
      if (!response.ok) {
        setError('This bylaw amendment could not be deleted.')
        return
      }
      setRows((current) => current.filter((item) => item.id !== row.id))
    } catch {
      setError('This bylaw amendment could not be deleted.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="section members-panel members-bylaw-submissions">
      <div className="wrap">
        <header className="members-panel__head">
          <p className="eyebrow">Members area</p>
          <h1>Bylaw submissions</h1>
          <p className="lead">Proposed by-law amendments submitted by members.</p>
        </header>

        <p className="bylaw-submissions__back">
          <Link to="/members/forms/bylaw">Back to the amendment form</Link>
        </p>

        {status === 'loading' && <Loader compact label="Loading bylaw submissions…" />}

        {error && (
          <p className="members-panel__error" role="alert">
            {error}
          </p>
        )}

        {status === 'ready' && rows.length === 0 && (
          <p className="members-panel__empty" role="status">
            No bylaw amendments have been submitted.
          </p>
        )}

        {status === 'ready' && rows.length > 0 && (
          <ul className="bylaw-submission-list">
            {rows.map((row) => {
              const excerpt = snippet(row)
              return (
                <li key={row.id}>
                  <article className="bylaw-submission-card">
                    <Link className="bylaw-submission-card__open" to={`/members/forms/bylaw/${row.id}`}>
                      <h2 className="bylaw-submission-card__who">{submitterLabel(row)}</h2>
                      <div className="bylaw-submission-card__body">
                        <p className="bylaw-submission-card__meta">Submitted {dateLabel(row.dateSubmitted)}</p>
                        <p className="bylaw-submission-card__cite">
                          Article {textOrDash(row.article)} · Section {textOrDash(row.section)}
                        </p>
                        {excerpt ? (
                          <p className="bylaw-submission-card__snippet">
                            <span>{excerpt.label}: </span>
                            {excerpt.text}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                    {canUpdateDelete ? (
                      <div className="bylaw-submission-card__actions">
                        <button
                          type="button"
                          className="bylaw-submission-card__delete"
                          onClick={() => remove(row)}
                          disabled={deletingId === row.id}
                        >
                          {deletingId === row.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    ) : null}
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export default function MembersBylawSubmissions() {
  const access = useBylawsAccess()
  if (access.loading) {
    return (
      <section className="section members-panel members-bylaw-submissions">
        <div className="wrap">
          <Loader compact label="Loading bylaw submissions…" />
        </div>
      </section>
    )
  }
  if (!access.canViewSubmissions) {
    return <Navigate to="/members/forms/bylaw" replace />
  }
  return <BylawSubmissionList canUpdateDelete={access.canUpdateDelete} />
}
