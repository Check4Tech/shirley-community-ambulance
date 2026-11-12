import { useEffect, useState } from 'react'
import { readSession } from '../../auth/session'
import { Field } from '../../components/UI'
import { useFormAccess } from './formAccess'
import { authorizedFetch } from './memberApi'
import { formatUsDate } from './memberDates'

const BLS_SKILLS = [
  'Bp',
  'Radio Report',
  'CPR',
  'Tourniquet',
  'Bleeding Control',
  'Medication Administration',
  'CPAP',
  'I-gel',
  'Patient Assessment',
  'Airway Control',
  'Spinal Immobilization',
  'BGL',
]

const ALS_SKILLS = [
  'IV',
  'IO',
  'Intubation',
  'Medication Administration',
  'IM Injection',
  'I-gel',
  'ALS Assessment',
  'Needle Decompression',
  'Surgical Cric',
  'CPAP',
]

// Uniform stays in this browser session. BLS and ALS preceptor forms are
// CUSTOM_FORM_DEFINITION templates on the Shirley server. Reimbursement is its
// own page and its own tables.
const FORMS = {
  uniform: {
    title: 'Uniform request',
    lead:
      'Say what you need. There is no forms service behind this page, so a request stays in this browser session only. It appears below after you submit it and is discarded when you refresh or leave.',
    empty: 'No uniform requests yet.',
    submit: 'Submit request',
    fields: [
      { name: 'item', label: 'Item', required: true },
      { name: 'size', label: 'Size', required: true },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: 1, step: 1 },
      { name: 'notes', label: 'Notes', rows: 4 },
    ],
  },
  bls: {
    title: 'BLS preceptor form',
    lead: 'Fill this in for the visit. It is saved on the Shirley server.',
    empty: 'No BLS preceptor forms yet.',
    submit: 'Submit form',
    editable: true,
    templateName: 'BLS Preceptor',
    fields: [
      { name: 'student', label: 'Student name', required: true },
      { name: 'preceptor', label: 'Preceptor name', required: true },
      { name: 'runNumber', label: 'Run #', required: true },
      { name: 'alarmDate', label: 'Alarm Date', type: 'date', required: true },
      { name: 'skills', label: 'Skills', type: 'radio', required: true, options: BLS_SKILLS },
      { name: 'notes', label: 'Notes', rows: 4 },
    ],
  },
  als: {
    title: 'ALS preceptor form',
    lead: 'Fill this in for the visit. It is saved on the Shirley server.',
    empty: 'No ALS preceptor forms yet.',
    submit: 'Submit form',
    editable: true,
    templateName: 'ALS Preceptor',
    fields: [
      { name: 'student', label: 'Student name', required: true },
      { name: 'preceptor', label: 'Preceptor name', required: true },
      { name: 'runNumber', label: 'Run #', required: true },
      { name: 'alarmDate', label: 'Alarm Date', type: 'date', required: true },
      { name: 'skills', label: 'Skills', type: 'radio', required: true, options: ALS_SKILLS },
      { name: 'notes', label: 'Notes', rows: 4 },
    ],
  },
}

function blankValues(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, '']))
}

function formatDate(value) {
  return formatUsDate(value) || value
}

function displayValue(field, value) {
  const text = String(value ?? '').trim()
  if (!text) return '—'
  if (field.type === 'date') return formatDate(text)
  if (field.name === 'amount') {
    const number = Number(text)
    if (Number.isFinite(number)) {
      return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    }
  }
  return text
}

function fieldError(field, raw) {
  if (field.type === 'radio' && field.required && !raw) return 'Choose a skill.'
  if (field.required && !raw) return `Enter ${field.label.toLowerCase()}.`
  if (field.name === 'quantity') {
    const number = Number(raw)
    if (!Number.isInteger(number) || number < 1) return 'Enter a whole quantity of at least 1.'
  }
  if (field.name === 'amount') {
    const number = Number(raw)
    if (!Number.isFinite(number) || number < 0) return 'Enter an amount of zero or more.'
  }
  return ''
}

function valuesFromEntry(fields, entry) {
  return Object.fromEntries(fields.map((field) => [field.name, entry?.[field.name] ?? '']))
}

function valuesPayload(fields, next) {
  const payload = {}
  for (const field of fields) {
    const raw = next[field.name] ?? ''
    if (field.type === 'radio') {
      payload[field.name] = String(field.options.indexOf(raw))
      continue
    }
    if (raw) payload[field.name] = raw
  }
  return payload
}

function entryFromSubmission(fields, submission) {
  let stored = {}
  try {
    stored = JSON.parse(submission.valuesJson || '{}')
  } catch {
    stored = {}
  }
  const entry = { id: submission.id }
  for (const field of fields) {
    const raw = stored[field.name]
    if (field.type === 'radio') {
      const index = Number(raw)
      entry[field.name] = Number.isInteger(index) ? (field.options[index] ?? '') : ''
    } else {
      entry[field.name] = raw == null ? '' : String(raw)
    }
  }
  if (!entry.notes && submission.notes) entry.notes = submission.notes
  return entry
}

function skillRows(options, rowCount = 3) {
  const perRow = Math.ceil(options.length / rowCount)
  const rows = []
  for (let start = 0; start < options.length; start += perRow) {
    rows.push(
      options.slice(start, start + perRow).map((option, offset) => ({
        option,
        index: start + offset,
      })),
    )
  }
  return rows
}

function SkillRadios({ field, kind, value, onChange }) {
  const rows = skillRows(field.options)
  return (
    <fieldset className="skill-options">
      <legend>
        {field.label}
        {field.required ? (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      <div className="skill-options__rows">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="skill-options__row">
            {row.map(({ option, index }) => {
              const id = `${kind}-${field.name}-${index}`
              return (
                <label key={option} htmlFor={id}>
                  <input
                    id={id}
                    type="radio"
                    name={`${kind}-${field.name}`}
                    value={option}
                    checked={value === option}
                    required={field.required}
                    onChange={onChange}
                  />
                  <span>{option}</span>
                </label>
              )
            })}
          </div>
        ))}
      </div>
    </fieldset>
  )
}

function SessionForm({ kind }) {
  const form = FORMS[kind]
  const access = useFormAccess(form.editable === true)
  const [entries, setEntries] = useState([])
  const [values, setValues] = useState(() => blankValues(form.fields))
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [definitionId, setDefinitionId] = useState(null)
  const [loaded, setLoaded] = useState(!form.templateName)
  const [saving, setSaving] = useState(false)
  const canEdit = access.canEdit

  useEffect(() => {
    if (!form.templateName) return undefined
    const session = readSession()
    if (!session) {
      setLoaded(true)
      setError('Sign in again to load this form.')
      return undefined
    }
    let cancelled = false
    async function load() {
      try {
        const definitions = await authorizedFetch(session, '/custom-forms/definitions')
        if (!definitions.response.ok) {
          throw new Error(definitions.message || 'The form template could not be loaded.')
        }
        const defs = await definitions.response.json()
        const match = (Array.isArray(defs) ? defs : []).find(
          (item) => item?.name === form.templateName && item.isActive !== false,
        )
        if (!match) {
          if (!cancelled) {
            setError(`${form.templateName} is not on the server yet.`)
            setLoaded(true)
          }
          return
        }
        const submissions = await authorizedFetch(
          session,
          `/custom-forms/submissions?formDefinitionId=${match.id}`,
        )
        if (!submissions.response.ok) {
          throw new Error(submissions.message || 'Saved forms could not be loaded.')
        }
        const body = await submissions.response.json()
        const saved = (Array.isArray(body) ? body : [])
          .map((item) => entryFromSubmission(form.fields, item))
          .reverse()
        if (!cancelled) {
          setDefinitionId(match.id)
          setEntries(saved)
          setLoaded(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'The form could not be loaded.')
          setLoaded(true)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [form])

  function update(name) {
    return (event) => {
      setError('')
      setValues((current) => ({ ...current, [name]: event.target.value }))
    }
  }

  function beginEdit(entry) {
    const source = entry ?? entries[entries.length - 1]
    if (source) {
      setEditingId(source.id)
      setValues(valuesFromEntry(form.fields, source))
    } else {
      setEditingId('new')
      setValues(blankValues(form.fields))
    }
    setError('')
    requestAnimationFrame(() => {
      document.getElementById(`${kind}-session-form`)?.scrollIntoView({ block: 'start' })
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setValues(blankValues(form.fields))
    setError('')
  }

  function collectedValues() {
    const next = {}
    for (const field of form.fields) {
      const raw = String(values[field.name] ?? '').trim()
      const problem = fieldError(field, raw)
      if (problem) {
        setError(problem)
        return null
      }
      next[field.name] = raw
    }
    return next
  }

  function rememberEntry(entry) {
    setEntries((current) => {
      if (editingId && editingId !== 'new') {
        return current.map((item) => (item.id === editingId ? entry : item))
      }
      return [...current, entry]
    })
    setEditingId(null)
    setValues(blankValues(form.fields))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const next = collectedValues()
    if (!next) return
    if (!form.templateName) {
      rememberEntry({ id: crypto.randomUUID(), ...next })
      return
    }
    if (!definitionId) {
      setError(`${form.templateName} is not on the server yet.`)
      return
    }
    const updating = editingId && editingId !== 'new'
    setSaving(true)
    try {
      const session = readSession()
      const body = {
        formDefinitionId: definitionId,
        notes: next.notes || undefined,
        valuesJson: JSON.stringify(valuesPayload(form.fields, next)),
      }
      const { response, message } = await authorizedFetch(
        session,
        updating ? `/custom-forms/submissions/${editingId}` : '/custom-forms/submissions',
        { method: updating ? 'PATCH' : 'POST', body: JSON.stringify(body) },
      )
      if (!response.ok) {
        setError(message || 'The form could not be saved.')
        return
      }
      rememberEntry(entryFromSubmission(form.fields, await response.json()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The form could not be saved.')
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
          <h1>{form.title}</h1>
          <p className="lead">{form.lead}</p>
          {canEdit && !editing ? (
            <p className="session-form__edit">
              <button type="button" className="btn btn--outline btn--sm" onClick={() => beginEdit()}>
                Edit
              </button>
            </p>
          ) : null}
        </header>

        {!loaded ? (
          <p className="members-panel__empty" role="status">
            Loading saved forms…
          </p>
        ) : entries.length === 0 ? (
          <p className="members-panel__empty" role="status">
            {form.empty}
          </p>
        ) : (
          <ol className="session-list">
            {entries.map((entry) => (
              <li key={entry.id} className="session-card">
                <h2>{displayValue(form.fields[0], entry[form.fields[0].name])}</h2>
                <dl>
                  {form.fields.map((field) => (
                    <div key={field.name}>
                      <dt>{field.label}</dt>
                      <dd>{displayValue(field, entry[field.name])}</dd>
                    </div>
                  ))}
                </dl>
                {canEdit ? (
                  <p className="session-card__actions">
                    <button type="button" className="btn btn--outline btn--sm" onClick={() => beginEdit(entry)}>
                      Edit
                    </button>
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        <form
          id={`${kind}-session-form`}
          className={form.editable ? 'session-form session-form--wide' : 'session-form'}
          onSubmit={handleSubmit}
        >
          <h2>{editing ? 'Edit form' : form.submit}</h2>
          {error ? (
            <p className="members-panel__error" role="alert">
              {error}
            </p>
          ) : null}
          {form.fields.map((field) =>
            field.type === 'radio' ? (
              <SkillRadios
                key={field.name}
                field={field}
                kind={kind}
                value={values[field.name]}
                onChange={update(field.name)}
              />
            ) : (
              <Field
                key={field.name}
                label={field.label}
                name={`${kind}-${field.name}`}
                type={field.type}
                required={field.required}
                rows={field.rows}
                min={field.min}
                step={field.step}
                inputMode={field.inputMode}
                autoComplete="off"
                value={values[field.name]}
                onChange={update(field.name)}
              />
            ),
          )}
          <div className="btn-row">
            <button
              type="submit"
              className="btn btn--navy"
              disabled={saving || (Boolean(form.templateName) && !definitionId)}
            >
              {saving ? 'Saving…' : editing ? 'Save' : form.submit}
            </button>
            {editing ? (
              <button type="button" className="btn btn--outline" onClick={cancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  )
}

// A new form route should not keep the previous form's entries. React would
// otherwise reuse this screen when only the kind prop changes.
export default function MembersSessionForm({ kind }) {
  return <SessionForm key={kind} kind={kind} />
}
