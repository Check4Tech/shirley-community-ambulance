import { useEffect, useRef, useState } from 'react'
import { readSession } from '../../auth/session'
import { Field } from '../../components/UI'
import { authorizedFetch } from './memberApi'
import AddStudent from './AddStudent'
import TrainingSection from './TrainingSection'
import { PROBATIONARY_PERMISSION, STUDENTS_PERMISSION } from './cohortAccess'

export const VITAL_SIGNS_TEMPLATE = 'Vital Signs'

const FIELD_IDS = ['student', 'systolic', 'diastolic', 'heartRate', 'pulseQuality', 'pupilSize', 'skinColor']

function blankValues() {
  return {
    studentId: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    pulseQuality: '',
    pupilSize: '',
    skinColor: '',
  }
}

function optionList(field) {
  if (!Array.isArray(field?.options)) return []
  return field.options.map((option) => String(option))
}

function fieldsById(fields) {
  const map = new Map()
  fields.forEach((field) => {
    if (field?.id) map.set(field.id, field)
  })
  return map
}

function templateReady(fields) {
  const map = fieldsById(fields)
  return FIELD_IDS.every((id) => map.has(id)) && optionList(map.get('pulseQuality')).length >= 2 && optionList(map.get('pupilSize')).length >= 2
}

function pupilMillimeters(option, index) {
  const size = Number(String(option).trim())
  if (Number.isInteger(size) && size >= 1 && size <= 7) return size
  return index + 1
}

function pupilDiameter(option, index) {
  return Math.round(pupilMillimeters(option, index) * 3.6)
}

function pupilValueLabel(option, index) {
  const size = pupilMillimeters(option, index)
  if (size === 1) return '1mm (pinpoint)'
  return `${size}mm`
}

function PupilChoice({ option, index }) {
  const size = pupilDiameter(option, index)
  return (
    <span className="pupil-choice">
      <span className="pupil-choice__dot" style={{ width: `${size}px`, height: `${size}px` }} />
      <span className="pupil-choice__value">{pupilValueLabel(option, index)}</span>
    </span>
  )
}

function PupilSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = options.indexOf(value)

  useEffect(() => {
    if (!open) return undefined
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function choose(option) {
    onChange(option)
    setOpen(false)
  }

  return (
    <div className="pupil-select" ref={rootRef}>
      <button
        type="button"
        className="pupil-select__button"
        aria-labelledby="vital-pupil-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selected >= 0 ? (
          <PupilChoice option={value} index={selected} />
        ) : (
          <span className="pupil-select__placeholder">Choose a size…</span>
        )}
        <span className="pupil-select__chevron" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="pupil-select__menu" role="listbox" aria-label="Pupil size">
          {options.map((option, index) => (
            <li key={`${option}-${index}`}>
              <button
                type="button"
                role="option"
                aria-selected={value === option}
                onClick={() => choose(option)}
              >
                <PupilChoice option={option} index={index} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function quantity(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const number = Number(text)
  if (!Number.isFinite(number) || number < 0) return null
  return number
}

export default function StudentTools({ students = [], onStudentAdded, certification = 'STUDENT', children }) {
  const [panel, setPanel] = useState('personnel')
  const [values, setValues] = useState(blankValues)
  const [fields, setFields] = useState([])
  const [definitionId, setDefinitionId] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
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
          (item) => item?.name === VITAL_SIGNS_TEMPLATE && item.isActive !== false,
        )
        if (!match) {
          if (!cancelled) {
            setError(`${VITAL_SIGNS_TEMPLATE} is not on the server yet.`)
            setLoaded(true)
          }
          return
        }
        let parsed = []
        try {
          const document = JSON.parse(match.fieldsJson || '{}')
          parsed = Array.isArray(document?.fields) ? document.fields : []
        } catch {
          parsed = []
        }
        if (!templateReady(parsed)) {
          if (!cancelled) {
            setError(`${VITAL_SIGNS_TEMPLATE} is not on the server yet.`)
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
        await submissions.response.json()
        if (!cancelled) {
          setFields(parsed)
          setDefinitionId(match.id)
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
  }, [])

  const byId = fieldsById(fields)
  const pulseOptions = optionList(byId.get('pulseQuality'))
  const pupilOptions = optionList(byId.get('pupilSize'))
  const canSubmit = Boolean(definitionId) && !saving
  const probationary = String(certification).toUpperCase() === 'PROBATIONARY'
  const personNoun = probationary ? 'probationary member' : 'student'

  function update(name) {
    return (event) => {
      setError('')
      setSaved('')
      setValues((current) => ({ ...current, [name]: event.target.value }))
    }
  }

  function collected() {
    const student = students.find((item) => String(item.id) === values.studentId)
    const systolic = quantity(values.systolic)
    const diastolic = quantity(values.diastolic)
    const heartRate = quantity(values.heartRate)
    const skinColor = values.skinColor.trim()
    if (!student || !String(student.name ?? '').trim()) return fail(`Choose a ${personNoun}.`)
    if (systolic == null || diastolic == null) return fail('Enter systolic and diastolic blood pressure.')
    if (heartRate == null) return fail('Enter a heart rate.')
    if (!pulseOptions.includes(values.pulseQuality)) return fail('Choose a pulse quality.')
    if (!pupilOptions.includes(values.pupilSize)) return fail('Choose a pupil size.')
    if (!skinColor) return fail('Enter a skin color.')
    return {
      studentUserId: Number(student.id),
      values: {
        student: String(student.name).trim(),
        systolic,
        diastolic,
        heartRate,
        pulseQuality: String(pulseOptions.indexOf(values.pulseQuality)),
        pupilSize: String(pupilOptions.indexOf(values.pupilSize)),
        skinColor,
      },
    }
  }

  function fail(message) {
    setError(message)
    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!definitionId) {
      setError(`${VITAL_SIGNS_TEMPLATE} is not on the server yet.`)
      return
    }
    const payload = collected()
    if (!payload) return
    setSaving(true)
    try {
      const session = readSession()
      const { response, message } = await authorizedFetch(session, '/custom-forms/submissions', {
        method: 'POST',
        body: JSON.stringify({
          formDefinitionId: definitionId,
          studentUserId: payload.studentUserId,
          valuesJson: JSON.stringify(payload.values),
        }),
      })
      if (!response.ok) {
        setError(message || 'The form could not be saved.')
        return
      }
      const savedBody = await response.json()
      setValues(blankValues())
      const notice = typeof savedBody?.emailNotice === 'string' ? savedBody.emailNotice.trim() : ''
      if (notice) {
        setError(notice)
        setSaved('')
      } else {
        setSaved('Saved.')
        setError('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The form could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="student-tools">
      <nav className="student-subnav" aria-label={probationary ? 'Probationary' : 'Student'}>
        <button
          type="button"
          aria-current={panel === 'personnel' ? 'page' : undefined}
          onClick={() => setPanel('personnel')}
        >
          Personnel
        </button>
        <button
          type="button"
          aria-current={panel === 'training' ? 'page' : undefined}
          onClick={() => setPanel('training')}
        >
          Training
        </button>
        <button
          type="button"
          aria-current={panel === 'vitals' ? 'page' : undefined}
          onClick={() => setPanel('vitals')}
        >
          Vital Signs
        </button>
      </nav>

      <div className="student-panel" hidden={panel !== 'personnel'}>
        <h2>Personnel</h2>
        <AddStudent certification={certification} onAdded={onStudentAdded} />
        {children}
      </div>

      <div className="student-panel" hidden={panel !== 'training'}>
        <h2>Training</h2>
        <TrainingSection
          active={panel === 'training'}
          students={students}
          memberKind={probationary ? 'probationary' : 'student'}
          managePermission={probationary ? PROBATIONARY_PERMISSION : STUDENTS_PERMISSION}
        />
      </div>

      <div className="student-panel" hidden={panel !== 'vitals'}>
        <form className="session-form student-vitals" onSubmit={handleSubmit}>
          <h2>Vital Signs</h2>
          {!loaded ? (
            <p className="members-panel__empty" role="status">
              Loading the vital signs form…
            </p>
          ) : null}
          {error ? (
            <p className="members-panel__error" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="members-panel__empty" role="status">
              {saved}
            </p>
          ) : null}
          {loaded && definitionId ? (
            <>
              <Field
                label={probationary ? 'Probationary member' : byId.get('student')?.label || 'Student name'}
                name="vital-student"
                required
                autoComplete="off"
                value={values.studentId}
                onChange={update('studentId')}
                options={[
                  { value: '', label: probationary ? 'Choose a probationary member…' : 'Choose a student…' },
                  ...students
                    .filter((student) => student.id != null)
                    .map((student) => ({ value: String(student.id), label: student.name || student.username })),
                ]}
              />
              <fieldset className="bp-pair">
                <Field
                  label="Systolic Blood Pressure"
                  name="vital-systolic"
                  type="number"
                  required
                  min={0}
                  step={1}
                  inputMode="numeric"
                  autoComplete="off"
                  value={values.systolic}
                  onChange={update('systolic')}
                />
                <span className="bp-pair__slash" aria-hidden="true">
                  /
                </span>
                <Field
                  label="Diastolic Blood Pressure"
                  name="vital-diastolic"
                  type="number"
                  required
                  min={0}
                  step={1}
                  inputMode="numeric"
                  autoComplete="off"
                  value={values.diastolic}
                  onChange={update('diastolic')}
                />
              </fieldset>
              <Field
                label={byId.get('heartRate')?.label || 'Heart rate'}
                name="vital-heart-rate"
                type="number"
                required
                min={0}
                step={1}
                inputMode="numeric"
                autoComplete="off"
                value={values.heartRate}
                onChange={update('heartRate')}
              />
              <fieldset className="vital-radios">
                <legend>
                  {byId.get('pulseQuality')?.label || 'Pulse quality'}
                  <span className="field__req" aria-hidden="true">
                    *
                  </span>
                </legend>
                {pulseOptions.map((option) => {
                  const id = `vital-pulse-${option}`
                  return (
                    <label key={option} htmlFor={id}>
                      <input
                        id={id}
                        type="radio"
                        name="vital-pulse"
                        value={option}
                        checked={values.pulseQuality === option}
                        required
                        onChange={update('pulseQuality')}
                      />
                      <span>{option}</span>
                    </label>
                  )
                })}
              </fieldset>
              <div className="pupil-field">
                <p className="pupil-field__label" id="vital-pupil-label">
                  Pupils
                  <span className="field__req" aria-hidden="true">
                    *
                  </span>
                </p>
                <PupilSelect
                  options={pupilOptions}
                  value={values.pupilSize}
                  onChange={(next) => {
                    setError('')
                    setSaved('')
                    setValues((current) => ({ ...current, pupilSize: next }))
                  }}
                />
              </div>
              <Field
                label={byId.get('skinColor')?.label || 'Skin color'}
                name="vital-skin-color"
                required
                autoComplete="off"
                value={values.skinColor}
                onChange={update('skinColor')}
              />
            </>
          ) : null}
          <div className="btn-row">
            <button type="submit" className="btn btn--navy" disabled={!canSubmit}>
              {saving ? 'Saving…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
