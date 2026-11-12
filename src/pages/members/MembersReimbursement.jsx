import { useEffect, useState } from 'react'
import { readSession } from '../../auth/session'
import { Field } from '../../components/UI'
import { canReviewReimbursement, useFormAccess } from './formAccess'
import { authorizedFetch } from './memberApi'

const DISCLAIMER = 'Alcohol purchases will not be reimbursed.'

function blankItem() {
  return { key: crypto.randomUUID(), item: '', cost: '' }
}

function money(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '$0.00'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function cents(value) {
  const n = Number(String(value).trim())
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

function liveTotal(items) {
  return items.reduce((sum, row) => {
    const amount = cents(row.cost)
    return sum + (amount == null || amount < 0 ? 0 : amount)
  }, 0) / 100
}

function rowsToSave(items) {
  const filled = []
  for (const row of items) {
    const item = row.item.trim()
    const costText = String(row.cost).trim()
    if (!item && !costText) continue
    if (!item) return { error: 'Enter a name for each item.' }
    const amount = cents(costText)
    if (amount == null) return { error: 'Enter a cost for each item.' }
    if (amount < 0) return { error: 'Item cost cannot be negative.' }
    filled.push({ item, cost: amount / 100 })
  }
  if (filled.length === 0) return { error: 'Add at least one item.' }
  return { items: filled }
}

export default function MembersReimbursement() {
  const session = readSession()
  const access = useFormAccess(true)
  const canReview = canReviewReimbursement(session, access.permissions)

  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [items, setItems] = useState(() => [blankItem()])
  const [approved, setApproved] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const current = readSession()
    let cancelled = false
    async function load() {
      try {
        const { response, message } = await authorizedFetch(current, '/reimbursements')
        if (!response.ok) {
          if (!cancelled) setError(message || 'Saved reimbursements could not be loaded.')
          return
        }
        const body = await response.json()
        if (!cancelled) setEntries(Array.isArray(body) ? body : [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Saved reimbursements could not be loaded.')
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  function resetForm() {
    setName('')
    setItems([blankItem()])
    setApproved(false)
    setEditingId(null)
  }

  function updateItem(key, field, value) {
    setItems((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)))
  }

  function addItem() {
    setItems((current) => [...current, blankItem()])
  }

  function removeItem(key) {
    setItems((current) => {
      if (current.length === 1) return [blankItem()]
      return current.filter((row) => row.key !== key)
    })
  }

  function beginEdit(entry) {
    setEditingId(entry.id)
    setName(entry.name || '')
    setApproved(entry.status === 'APPROVED')
    const rows = Array.isArray(entry.items) ? entry.items : []
    setItems(
      rows.length
        ? rows.map((row) => ({
            key: crypto.randomUUID(),
            item: row.item || '',
            cost: row.cost == null ? '' : String(row.cost),
          }))
        : [blankItem()],
    )
    setError('')
  }

  async function saveStatus(entry, status) {
    setSaving(true)
    setError('')
    try {
      const { response, message } = await authorizedFetch(session, `/reimbursements/${entry.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        setError(message || 'The reimbursement could not be updated.')
        return
      }
      const saved = await response.json()
      setEntries((current) => current.map((row) => (row.id === saved.id ? saved : row)))
      if (editingId === saved.id) setApproved(saved.status === 'APPROVED')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The reimbursement could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const submitter = name.trim()
    if (!submitter) {
      setError('Name is required.')
      return
    }
    const prepared = rowsToSave(items)
    if (prepared.error) {
      setError(prepared.error)
      return
    }

    setSaving(true)
    setError('')
    const editing = editingId !== null
    const payload = { name: submitter, items: prepared.items }
    if (editing && canReview) payload.status = approved ? 'APPROVED' : 'PENDING'
    try {
      const { response, message } = await authorizedFetch(
        session,
        editing ? `/reimbursements/${editingId}` : '/reimbursements',
        { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
      )
      if (!response.ok) {
        setError(message || 'The reimbursement could not be saved.')
        return
      }
      const saved = await response.json()
      setEntries((current) => {
        if (!editing) return [saved, ...current]
        return current.map((row) => (row.id === saved.id ? saved : row))
      })
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The reimbursement could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const editing = editingId !== null

  return (
    <section className="section members-panel members-form">
      <div className="wrap">
        <header className="members-panel__head members-panel__head--center">
          <p className="eyebrow">Members area</p>
          <h1>Reimbursement</h1>
          <p className="lead">
            Add each item and its cost. The total is calculated for you. After you submit, the form is sent to the
            treasurer, and an admin can approve it.
          </p>
        </header>

        {!loaded ? (
          <p className="members-panel__empty" role="status">
            Loading reimbursements…
          </p>
        ) : entries.length === 0 ? (
          <p className="members-panel__empty" role="status">
            No reimbursements yet.
          </p>
        ) : (
          <ol className="session-list">
            {entries.map((entry) => (
              <li key={entry.id} className="session-card">
                <h2>{entry.name}</h2>
                <p className={entry.status === 'APPROVED' ? 'reimbursement-status reimbursement-status--approved' : 'reimbursement-status reimbursement-status--pending'}>
                  {entry.status === 'APPROVED' ? 'Approved' : 'Pending'}
                </p>
                <dl>
                  {(entry.items || []).map((item) => (
                    <div key={item.id}>
                      <dt>{item.item}</dt>
                      <dd>{money(item.cost)}</dd>
                    </div>
                  ))}
                  <div>
                    <dt>Total</dt>
                    <dd>{money(entry.total)}</dd>
                  </div>
                </dl>
                {canReview ? (
                  <p className="session-card__actions">
                    <button type="button" className="btn btn--outline btn--sm" onClick={() => beginEdit(entry)} disabled={saving}>
                      Edit
                    </button>
                    {entry.status !== 'APPROVED' ? (
                      <button type="button" className="btn btn--navy btn--sm" onClick={() => saveStatus(entry, 'APPROVED')} disabled={saving}>
                        Approve
                      </button>
                    ) : null}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        <form className="session-form session-form--wide" onSubmit={handleSubmit}>
          <p className="reimbursement-disclaimer" role="note">
            {DISCLAIMER}
          </p>
          <h2>{editing ? 'Edit reimbursement' : 'Submit reimbursement'}</h2>
          {error ? (
            <p className="members-panel__error" role="alert">
              {error}
            </p>
          ) : null}
          <Field label="Name" name="reimbursement-name" required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
          <div className="reimbursement-items">
            {items.map((row, index) => (
              <div className="reimbursement-item" key={row.key}>
                <div className="reimbursement-item__name">
                  <Field
                    label={index === 0 ? 'Item' : `Item ${index + 1}`}
                    name={`reimbursement-item-${row.key}`}
                    autoComplete="off"
                    value={row.item}
                    onChange={(event) => updateItem(row.key, 'item', event.target.value)}
                  />
                </div>
                <div className="reimbursement-item__cost">
                  <Field
                    label="Cost"
                    name={`reimbursement-cost-${row.key}`}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    autoComplete="off"
                    value={row.cost}
                    onChange={(event) => updateItem(row.key, 'cost', event.target.value)}
                  />
                </div>
                <button type="button" className="btn btn--outline btn--sm" onClick={() => removeItem(row.key)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          <p className="reimbursement-add">
            <button type="button" className="btn btn--outline btn--sm" onClick={addItem}>
              Add item
            </button>
          </p>
          <p className="reimbursement-total">
            Total <span>{money(liveTotal(items))}</span>
          </p>
          {editing && canReview ? (
            <label className="reimbursement-approve">
              <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
              Approved
            </label>
          ) : null}
          <div className="btn-row">
            <button type="submit" className="btn btn--navy" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save' : 'Submit reimbursement'}
            </button>
            {editing ? (
              <button type="button" className="btn btn--outline" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  )
}
