import { useState } from 'react'
import { Field } from '../../components/UI'

// Shirley has no forms API. Each form keeps what this visit submits, and a
// refresh discards it. Nothing here is loaded from a server.
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
  reimbursement: {
    title: 'Reimbursement',
    lead:
      'Record what the expense was for. There is no forms service behind this page, so an entry stays in this browser session only. It appears below after you submit it and is discarded when you refresh or leave.',
    empty: 'No reimbursements yet.',
    submit: 'Submit reimbursement',
    fields: [
      { name: 'purpose', label: 'What it was for', required: true },
      {
        name: 'amount',
        label: 'Amount',
        type: 'number',
        required: true,
        min: 0,
        step: '0.01',
        inputMode: 'decimal',
      },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'notes', label: 'Notes', rows: 4 },
    ],
  },
  bls: {
    title: 'BLS preceptor form',
    lead:
      'Fill this in for the visit. There is no forms service behind this page, so an entry stays in this browser session only. It appears below after you submit it and is discarded when you refresh or leave.',
    empty: 'No BLS preceptor forms yet.',
    submit: 'Submit form',
    fields: [
      { name: 'student', label: 'Student name', required: true },
      { name: 'preceptor', label: 'Preceptor name', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'notes', label: 'Notes', rows: 4 },
    ],
  },
  als: {
    title: 'ALS preceptor form',
    lead:
      'Fill this in for the visit. There is no forms service behind this page, so an entry stays in this browser session only. It appears below after you submit it and is discarded when you refresh or leave.',
    empty: 'No ALS preceptor forms yet.',
    submit: 'Submit form',
    fields: [
      { name: 'student', label: 'Student name', required: true },
      { name: 'preceptor', label: 'Preceptor name', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'notes', label: 'Notes', rows: 4 },
    ],
  },
}

function blankValues(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, '']))
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  return `${match[2]}/${match[3]}/${match[1]}`
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

function SessionForm({ kind }) {
  const form = FORMS[kind]
  const [entries, setEntries] = useState([])
  const [values, setValues] = useState(() => blankValues(form.fields))
  const [error, setError] = useState('')

  function update(name) {
    return (event) => {
      setError('')
      setValues((current) => ({ ...current, [name]: event.target.value }))
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const next = {}
    for (const field of form.fields) {
      const raw = String(values[field.name] ?? '').trim()
      const problem = fieldError(field, raw)
      if (problem) {
        setError(problem)
        return
      }
      next[field.name] = raw
    }
    setEntries((current) => [...current, { id: crypto.randomUUID(), ...next }])
    setValues(blankValues(form.fields))
    setError('')
  }

  return (
    <section className="section members-panel members-form">
      <div className="wrap">
        <header className="members-panel__head members-panel__head--center">
          <p className="eyebrow">Members area</p>
          <h1>{form.title}</h1>
          <p className="lead">{form.lead}</p>
        </header>

        {entries.length === 0 ? (
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
              </li>
            ))}
          </ol>
        )}

        <form className="session-form" onSubmit={handleSubmit}>
          <h2>{form.submit}</h2>
          {error ? (
            <p className="members-panel__error" role="alert">
              {error}
            </p>
          ) : null}
          {form.fields.map((field) => (
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
          ))}
          <button type="submit" className="btn btn--navy">
            {form.submit}
          </button>
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
