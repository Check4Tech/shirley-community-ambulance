import { useEffect, useState } from 'react'
import Loader from '../../components/Loader'
import { Field } from '../../components/UI'
import { readSession } from '../../auth/session'
import { callStatsForInstant } from './callStats'
import { authorizedFetch } from './memberApi'
import { formatUsDate, todayUsDate, toIsoDate } from './memberDates'
import { useMessageBoardAccess } from './messageBoardAccess'
import { useCaretRestore } from './useCaretRestore'

const PLACEHOLDER_POSTS = [
  {
    id: 'welcome',
    title: 'Welcome to the members board',
    postedOn: '2026-10-01',
    body: 'Placeholder post. Crew notices, meeting reminders, and training updates will show up here once a message board is connected.',
  },
  {
    id: 'meetings',
    title: 'Monthly meetings',
    postedOn: '2026-10-01',
    body: 'Placeholder post. Board meeting is the first Thursday, general meeting the second Thursday, and training the fourth Thursday. All three are at 1930.',
  },
  {
    id: 'rigs',
    title: 'Rig checks',
    postedOn: '2026-10-04',
    body: 'Placeholder post. Use Rig Checks in the members menu to open Check4Tech and complete a rig check with your current sign-in.',
  },
]

function blankDraft() {
  return { id: null, title: '', postedOn: todayUsDate(), body: '' }
}

function draftFromPost(post) {
  return {
    id: post.id,
    title: String(post.title || '').toUpperCase(),
    postedOn: formatUsDate(post.postedOn),
    body: String(post.body || '').toUpperCase(),
  }
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5zm15.7-9.2a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.2 1.2 3.5 3.5 0.7-1.7z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function MembersHome() {
  const access = useMessageBoardAccess()
  const [loading, setLoading] = useState(true)
  const [remote, setRemote] = useState(false)
  const [posts, setPosts] = useState(PLACEHOLDER_POSTS)
  const [draft, setDraft] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { year, months } = callStatsForInstant()
  const peak = Math.max(...months.map((row) => row.count))
  const canManage = remote && access.canEdit
  const rememberCaret = useCaretRestore()

  useEffect(() => {
    const session = readSession()
    if (!session) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    async function load() {
      try {
        const { response, message } = await authorizedFetch(session, '/message-board')
        if (cancelled) return
        if (!response.ok) {
          if (response.status !== 404) setError(message || 'The message board could not be loaded.')
          setLoading(false)
          return
        }
        const body = await response.json()
        setPosts(Array.isArray(body) ? body : [])
        setRemote(true)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'The message board could not be loaded.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  function openCreate() {
    setError('')
    setDraft(blankDraft())
  }

  function openEdit(post) {
    setError('')
    setDraft(draftFromPost(post))
  }

  function updateDraft(field, value) {
    const next = field === 'postedOn' ? value : String(value ?? '').toUpperCase()
    setDraft((current) => (current ? { ...current, [field]: next } : current))
  }

  async function saveDraft(event) {
    event.preventDefault()
    if (!draft) return
    const title = draft.title.trim().toUpperCase()
    const body = draft.body.trim().toUpperCase()
    const postedOn = toIsoDate(draft.postedOn)
    if (!title || !body || !postedOn) {
      setError('Each post needs a title, a date as MM/DD/YYYY, and a message.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const session = readSession()
      const { response, message } = await authorizedFetch(
        session,
        draft.id ? `/message-board/${draft.id}` : '/message-board',
        {
          method: draft.id ? 'PATCH' : 'POST',
          body: JSON.stringify({ title, body, postedOn }),
        },
      )
      if (!response.ok) {
        setError(message || 'The post could not be saved.')
        return
      }
      const saved = await response.json()
      setPosts((current) => {
        if (!draft.id) return [...current, saved]
        return current.map((post) => (post.id === saved.id ? saved : post))
      })
      setDraft(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The post could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function askDelete(post) {
    setError('')
    setPendingDelete(post)
  }

  function closeDelete() {
    if (deleting) return
    setError('')
    setPendingDelete(null)
  }

  async function confirmDelete(event) {
    event.preventDefault()
    if (!pendingDelete) return
    setDeleting(true)
    setError('')
    try {
      const session = readSession()
      const { response, message } = await authorizedFetch(session, `/message-board/${pendingDelete.id}`, { method: 'DELETE' })
      if (!response.ok) {
        setError(message || 'The post could not be deleted.')
        return
      }
      const removedId = pendingDelete.id
      setPosts((current) => current.filter((item) => item.id !== removedId))
      setPendingDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The post could not be deleted.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="section members-panel members-home">
      <div className="members-home__row">
        <div className="bulletin">
          <header className="members-panel__head">
            <p className="eyebrow">Members home</p>
            <div className="bulletin__title-row">
              <h1>Message board</h1>
              {canManage ? (
                <button type="button" className="btn btn--outline btn--sm" onClick={openCreate}>
                  Add
                </button>
              ) : null}
            </div>
          </header>

          {loading ? (
            <Loader compact label="Loading the message board…" />
          ) : (
            <>
              {error && !draft && !pendingDelete ? (
                <p className="members-panel__error" role="alert">
                  {error}
                </p>
              ) : null}
              {posts.length === 0 ? (
                <p className="members-panel__empty" role="status">
                  No messages yet.
                </p>
              ) : (
                <ol className="bulletin__list">
                  {posts.map((post) => (
                    <li key={post.id} className="bulletin__post">
                      <p className="bulletin__date">
                        <time dateTime={toIsoDate(post.postedOn) || undefined}>{formatUsDate(post.postedOn)}</time>
                        {canManage ? (
                          <span className="bulletin__actions">
                            <button type="button" className="bulletin__icon bulletin__icon--edit" aria-label={`Edit ${post.title}`} onClick={() => openEdit(post)}>
                              <IconPencil />
                            </button>
                            <button type="button" className="bulletin__icon bulletin__icon--delete" aria-label={`Delete ${post.title}`} onClick={() => askDelete(post)}>
                              <IconTrash />
                            </button>
                          </span>
                        ) : null}
                      </p>
                      <h2>{post.title}</h2>
                      <p>{post.body}</p>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
          {draft ? (
            <div className="calendar-modal" role="presentation" onMouseDown={() => setDraft(null)}>
              <form
                className="calendar-modal__panel bulletin-modal board-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="board-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
                onSubmit={saveDraft}
              >
                <header className="calendar-modal__head">
                  <h2 id="board-dialog-title">{draft.id ? 'Edit post' : 'Add post'}</h2>
                  <button type="button" className="calendar-modal__close" aria-label="Close" onClick={() => setDraft(null)}>
                    ×
                  </button>
                </header>
                {error ? (
                  <p className="members-panel__error" role="alert">
                    {error}
                  </p>
                ) : null}
                <Field label="Title" name="board-title" required value={draft.title} onChange={(event) => { rememberCaret(event.target); updateDraft('title', event.target.value) }} />
                <Field label="Date" name="board-date" required placeholder="MM/DD/YYYY" value={draft.postedOn} onChange={(event) => updateDraft('postedOn', event.target.value)} autoComplete="off" />
                <Field label="Message" name="board-body" rows={4} required value={draft.body} onChange={(event) => { rememberCaret(event.target); updateDraft('body', event.target.value) }} />
                <div className="btn-row">
                  <button type="submit" className="btn btn--navy btn--sm" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => setDraft(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : null}
          {pendingDelete ? (
            <div className="calendar-modal" role="presentation" onMouseDown={closeDelete}>
              <form
                className="calendar-modal__panel bulletin-modal board-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="board-delete-title"
                onMouseDown={(event) => event.stopPropagation()}
                onSubmit={confirmDelete}
              >
                <header className="calendar-modal__head">
                  <h2 id="board-delete-title">Delete {pendingDelete.title}</h2>
                  <button type="button" className="calendar-modal__close" aria-label="Close" onClick={closeDelete}>
                    ×
                  </button>
                </header>
                {error ? (
                  <p className="members-panel__error" role="alert">
                    {error}
                  </p>
                ) : null}
                <p>Delete “{pendingDelete.title}”?</p>
                <div className="btn-row">
                  <button type="submit" className="btn btn--navy btn--sm" disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Confirm'}
                  </button>
                  <button type="button" className="btn btn--outline btn--sm" onClick={closeDelete}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>

        <aside className="call-stats" aria-labelledby="call-stats-title">
          <h2 id="call-stats-title">{year} calls</h2>
          <p className="call-stats__label">This year's calls</p>
          <ol className="call-stats__months">
            {months.map((row) => (
              <li key={row.month} className="call-stats__month">
                <span className="call-stats__name">{row.month}</span>
                <span className="call-stats__track" aria-hidden="true">
                  <span className="call-stats__bar" style={{ width: `${(row.count / peak) * 100}%` }} />
                </span>
                <span className="call-stats__count">{row.count}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  )
}
