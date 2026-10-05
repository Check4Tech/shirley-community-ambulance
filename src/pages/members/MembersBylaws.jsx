import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiBaseUrl, readSession } from '../../auth/session'
import Loader from '../../components/Loader'
import { Field } from '../../components/UI'
import { bylaws } from '../../data/bylaws'
import { shirleyCalendarDate } from '../../data/site'
import { useBylawsAccess } from './bylawAccess'

const SEEDED_BYLAWS = '/documents/bylaws.pdf'
const BYLAW_THANKS_KEY = 'sca-bylaw-proposal-thanks'
const BYLAW_THANKS = 'Thank you for submitting your Bylaw Proposal'

function readBylawThanks() {
  try {
    return sessionStorage.getItem(BYLAW_THANKS_KEY) === '1'
  } catch {
    return false
  }
}

function rememberBylawThanks() {
  try {
    sessionStorage.setItem(BYLAW_THANKS_KEY, '1')
    return true
  } catch {
    return false
  }
}

function bylawsDocumentUrl() {
  const base = apiBaseUrl()
  if (!base) return ''
  return `${base}/bylaws/document`
}

function isPdfFile(file) {
  const name = file?.name?.toLowerCase() ?? ''
  return name.endsWith('.pdf') || file?.type === 'application/pdf'
}

function findArticle(id) {
  return bylaws.find((article) => article.id === id) || null
}

function findSection(article, id) {
  return article?.sections.find((section) => section.id === id) || null
}

function findSubsection(section, id) {
  return section?.subsections.find((subsection) => subsection.id === id) || null
}

function paragraphChoices(section, subsectionId) {
  if (!section) return []
  const subsection = findSubsection(section, subsectionId)
  if (subsection) return subsection.paragraphs
  if (section.subsections.length > 0 && section.paragraphs.length === 0) return []
  return section.paragraphs
}

function paragraphIds(value) {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

function wordingForParagraphs(paragraphs, ids) {
  const selected = new Set(ids)
  return paragraphs
    .filter((item) => selected.has(item.id))
    .map((item) => item.text)
    .join('\n\n')
}

function currentWording(articleId, sectionId, subsectionId, paragraphId) {
  const section = findSection(findArticle(articleId), sectionId)
  if (!section) return ''
  const subsection = findSubsection(section, subsectionId)
  const paragraphs = paragraphChoices(section, subsectionId)
  const ids = paragraphIds(paragraphId)
  if (ids.length) return wordingForParagraphs(paragraphs, ids)
  if (subsection && subsection.paragraphs.length === 0) return subsection.text
  if (!subsection && section.subsections.length === 0 && section.paragraphs.length === 0) {
    return section.text
  }
  return ''
}

function articleLabel(article) {
  return `${article.label} — ${article.title}`
}

function sectionLabel(section) {
  return `${section.label} — ${section.title}`
}

function subsectionLabel(subsection) {
  return subsection.title ? `${subsection.label} — ${subsection.title}` : subsection.label
}

function paragraphLabel(paragraph) {
  const raw = paragraph.text.replace(/\s+/g, ' ').trim()
  return raw ? `${paragraph.label} — ${raw}` : paragraph.label
}

function paragraphSummary(paragraphs, selected) {
  const chosen = paragraphIds(selected)
  if (chosen.length === 0) return 'None'
  const allChecked = paragraphs.length > 0 && paragraphs.every((item) => chosen.includes(item.id))
  if (allChecked) return 'All paragraphs'
  if (chosen.length === 1) {
    const match = paragraphs.find((item) => item.id === chosen[0])
    return match ? paragraphLabel(match) : '1 paragraph'
  }
  return `${chosen.length} paragraphs`
}

function CiteSelect({ label, name, value, onChange, options, blank, disabled, required = false }) {
  return (
    <p className="field">
      <label htmlFor={`f-${name}`}>
        {label}
        {required ? (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <select
        id={`f-${name}`}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
      >
        {blank ? (
          <option value="">{blank}</option>
        ) : (
          <option value="" disabled>
            Choose one…
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </p>
  )
}

function ParagraphChecks({ paragraphs, selected, onChange, disabled, emptyLabel, open, onOpenChange, required = false }) {
  const chosen = paragraphIds(selected)
  const allChecked = paragraphs.length > 0 && paragraphs.every((item) => chosen.includes(item.id))
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const validityRef = useRef(null)

  const chosenKey = chosen.join(',')
  useEffect(() => {
    const input = validityRef.current
    if (!input) return
    input.setCustomValidity(required && chosenKey.length === 0 ? 'Select at least one paragraph.' : '')
  }, [required, chosenKey])

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) onOpenChange(false)
    }
    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      onOpenChange(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onOpenChange])

  if (disabled || paragraphs.length === 0) {
    return (
      <p className="field">
        <label htmlFor="f-paragraph">Paragraph #</label>
        <select id="f-paragraph" name="paragraph" value="" disabled={disabled} onChange={() => {}}>
          <option value="">{emptyLabel}</option>
        </select>
      </p>
    )
  }

  function toggle(id) {
    const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]
    onChange(next)
  }

  function finish() {
    onOpenChange(false)
    triggerRef.current?.focus()
  }

  const summary = paragraphSummary(paragraphs, chosen)

  return (
    <div className={`field bylaw-paragraphs${open ? ' is-open' : ''}`} ref={rootRef}>
      <label id="f-paragraph-label" htmlFor="f-paragraph">
        Paragraph #
        {required ? (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <button
        type="button"
        id="f-paragraph"
        className="bylaw-paragraphs__trigger"
        ref={triggerRef}
        aria-labelledby="f-paragraph-label f-paragraph-value"
        aria-expanded={open}
        aria-controls="f-paragraph-list"
        onClick={() => onOpenChange(!open)}
      >
        <span id="f-paragraph-value" className="bylaw-paragraphs__summary">
          {summary}
        </span>
        <span className="bylaw-paragraphs__caret" aria-hidden="true" />
      </button>
      {open ? (
        <div id="f-paragraph-list" className="bylaw-paragraphs__list" role="group" aria-labelledby="f-paragraph-label">
          <label className="bylaw-paragraphs__item bylaw-paragraphs__item--all">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => onChange(allChecked ? [] : paragraphs.map((item) => item.id))}
            />
            <span>Select all</span>
          </label>
          <div className="bylaw-paragraphs__options">
            {paragraphs.map((item) => (
              <label key={item.id} className="bylaw-paragraphs__item">
                <input
                  type="checkbox"
                  name="paragraph"
                  value={item.id}
                  checked={chosen.includes(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span className="bylaw-paragraphs__text">{paragraphLabel(item)}</span>
              </label>
            ))}
          </div>
          <button type="button" className="bylaw-paragraphs__done" onClick={finish}>
            Done
          </button>
        </div>
      ) : null}
      <input
        ref={validityRef}
        className="bylaw-paragraphs__validity"
        tabIndex={-1}
        aria-hidden="true"
        value={chosen.length ? 'selected' : ''}
        required={required}
        onChange={() => {}}
      />
    </div>
  )
}

function BylawsDocument({
  admin,
  canViewSubmissions,
  existing,
  canUpdateDelete,
  submitting,
  deleting,
  onDelete,
}) {
  const fileRef = useRef(null)
  const navigate = useNavigate()
  const [href, setHref] = useState(SEEDED_BYLAWS)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const showPdfUpdate = !existing && admin
  const showDelete = existing && canUpdateDelete
  const showSubmissions = !existing && canViewSubmissions

  useEffect(() => {
    const url = bylawsDocumentUrl()
    if (!url) return undefined
    let cancelled = false
    fetch(url, { method: 'HEAD' })
      .then((response) => {
        if (!cancelled && response.ok) setHref(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!isPdfFile(file)) {
      setNotice('Choose a PDF.')
      return
    }
    const url = bylawsDocumentUrl()
    const session = readSession()
    if (!url || !session?.accessToken) {
      setNotice('The bylaws PDF could not be saved.')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body,
      })
      if (response.status === 403) {
        setNotice('Only an admin can update the bylaws.')
        return
      }
      if (!response.ok) {
        setNotice(response.status === 400 ? 'Choose a PDF.' : 'The bylaws PDF could not be saved.')
        return
      }
      setHref(`${url}?v=${Date.now()}`)
      setNotice('Bylaws updated.')
    } catch {
      setNotice('The bylaws PDF could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bylaw-document">
      <div className="bylaw-document__start">
        <a className="bylaw-document__link" href={href} target="_blank" rel="noopener noreferrer">
          View Bylaws
        </a>
        {showPdfUpdate ? (
          <>
            <button
              type="button"
              className="bylaw-document__update"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              Update
            </button>
            <input
              ref={fileRef}
              className="bylaw-document__file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={onFile}
            />
          </>
        ) : null}
      </div>
      {showDelete ? (
        <button
          type="button"
          className="bylaw-document__link bylaw-document__corner"
          onClick={onDelete}
          disabled={deleting || submitting}
        >
          Delete
        </button>
      ) : null}
      {showSubmissions ? (
        <button
          type="button"
          className="bylaw-document__link bylaw-document__submissions bylaw-document__corner"
          onClick={() => navigate('/members/forms/bylaw/submissions')}
        >
          View Bylaw Submissions
        </button>
      ) : null}
      {notice ? (
        <p className="bylaw-document__notice" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  )
}

const EMPTY = {
  article: '',
  section: '',
  subsection: '',
  paragraph: [],
  reads: '',
  change: '',
  rationale: '',
  submittedBy1: '',
  submittedBy2: '',
  print1: '',
  print2: '',
  firstReading: '',
  secondReading: '',
  voteMeeting: '',
  voteChoice: '',
  voteResult: '',
  voteDate: '',
}

function emptyToNull(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text ? text : null
}

function dateInput(value) {
  const text = value == null ? '' : String(value).trim()
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text)
  return match ? match[1] : ''
}

function valuesFromAmendment(row) {
  return {
    article: row.article || '',
    section: row.section || '',
    subsection: row.subsection || '',
    paragraph: paragraphIds(row.selectedParagraphs),
    reads: row.reads || '',
    change: row.changeToRead || '',
    rationale: row.rationale || '',
    submittedBy1: row.submittedBy1 || '',
    submittedBy2: row.submittedBy2 || '',
    print1: row.signature1 || '',
    print2: row.signature2 || '',
    firstReading: dateInput(row.firstReading),
    secondReading: dateInput(row.secondReading),
    voteMeeting: dateInput(row.voteMeeting),
    voteChoice: row.voteChoice || '',
    voteResult: row.voteResult || '',
    voteDate: dateInput(row.voteDate),
  }
}

function amendmentPayload(values, asOf = new Date()) {
  const today = shirleyCalendarDate(asOf)
  return {
    article: values.article.trim(),
    section: values.section.trim(),
    subsection: emptyToNull(values.subsection),
    selectedParagraphs: paragraphIds(values.paragraph),
    reads: values.reads.trim(),
    changeToRead: values.change.trim(),
    rationale: values.rationale.trim(),
    dateSigned: today,
    dateSubmitted: today,
    dateReceived: today,
    submittedBy1: values.submittedBy1.trim(),
    submittedBy2: emptyToNull(values.submittedBy2),
    signature1: values.print1.trim(),
    signature2: emptyToNull(values.print2),
    firstReading: emptyToNull(values.firstReading),
    secondReading: emptyToNull(values.secondReading),
    voteMeeting: emptyToNull(values.voteMeeting),
    voteChoice: emptyToNull(values.voteChoice),
    voteResult: emptyToNull(values.voteResult),
    voteDate: emptyToNull(values.voteDate),
  }
}

export default function MembersBylaws() {
  const { id } = useParams()
  return <MembersBylawForm key={id ?? 'new'} />
}

function MembersBylawForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const access = useBylawsAccess()
  const existing = typeof id === 'string'
  const [values, setValues] = useState(EMPTY)
  const [notice, setNotice] = useState(null)
  const [thanks, setThanks] = useState(() => !existing && readBylawThanks())
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [paragraphsOpen, setParagraphsOpen] = useState(false)
  const [recordStatus, setRecordStatus] = useState(existing ? 'loading' : 'ready')
  const [recordError, setRecordError] = useState('')

  useEffect(() => {
    if (existing || !readBylawThanks()) return undefined
    window.scrollTo(0, 0)
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(BYLAW_THANKS_KEY)
      } catch {
        // Storage can be blocked; the message is already in component state.
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [existing])

  useEffect(() => {
    if (!existing) return undefined
    if (!/^\d+$/.test(id)) {
      setRecordStatus('error')
      setRecordError('This bylaw amendment could not be found.')
      return undefined
    }

    const session = readSession()
    const base = apiBaseUrl()
    if (!session?.accessToken || !base) {
      setRecordStatus('error')
      setRecordError('This bylaw amendment could not be loaded.')
      return undefined
    }

    let cancelled = false
    setRecordStatus('loading')
    setRecordError('')
    async function load() {
      try {
        const response = await fetch(`${base}/forms/bylaw/${id}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (cancelled) return
        if (response.status === 404) {
          setRecordStatus('error')
          setRecordError('This bylaw amendment could not be found.')
          return
        }
        if (!response.ok) {
          setRecordStatus('error')
          setRecordError(
            response.status === 403
              ? 'You do not have permission to view this bylaw amendment.'
              : 'This bylaw amendment could not be loaded.',
          )
          return
        }
        const row = await response.json()
        if (cancelled) return
        if (!row?.id) {
          setRecordStatus('error')
          setRecordError('This bylaw amendment could not be loaded.')
          return
        }
        setValues(valuesFromAmendment(row))
        setParagraphsOpen(false)
        setNotice(null)
        setThanks(false)
        setRecordStatus('ready')
      } catch {
        if (cancelled) return
        setRecordStatus('error')
        setRecordError('This bylaw amendment could not be loaded.')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [existing, id])

  function update(name) {
    return (event) => {
      const next = event.target.value
      setValues((current) => ({ ...current, [name]: next }))
    }
  }

  const article = findArticle(values.article)
  const section = findSection(article, values.section)
  const subsections = section?.subsections ?? []
  const subsectionBlank = Boolean(section) && (subsections.length === 0 || section.paragraphs.length > 0)
  const paragraphs = paragraphChoices(section, values.subsection)

  function chooseArticle(event) {
    setParagraphsOpen(false)
    setValues((current) => ({
      ...current,
      article: event.target.value,
      section: '',
      subsection: '',
      paragraph: [],
      reads: '',
    }))
  }

  function chooseSection(event) {
    const sectionId = event.target.value
    setParagraphsOpen(false)
    setValues((current) => ({
      ...current,
      section: sectionId,
      subsection: '',
      paragraph: [],
      reads: currentWording(current.article, sectionId, '', ''),
    }))
  }

  function chooseSubsection(event) {
    const subsectionId = event.target.value
    setParagraphsOpen(false)
    setValues((current) => ({
      ...current,
      subsection: subsectionId,
      paragraph: [],
      reads: currentWording(current.article, current.section, subsectionId, ''),
    }))
  }

  function chooseParagraphs(ids) {
    setValues((current) => ({
      ...current,
      paragraph: ids,
      reads: currentWording(current.article, current.section, current.subsection, ids),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (existing && !access.canUpdateDelete) return
    const form = event.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    const session = readSession()
    const base = apiBaseUrl()
    if (!session?.accessToken || !base) {
      setNotice({
        type: 'error',
        text: existing
          ? 'The amendment could not be saved. Sign in and try again.'
          : 'The amendment could not be submitted. Sign in and try again.',
      })
      return
    }

    const payload = amendmentPayload(values)
    setSubmitting(true)
    setNotice(null)
    if (!existing) setThanks(false)
    try {
      const response = await fetch(existing ? `${base}/forms/bylaw/${id}` : `${base}/forms/bylaw`, {
        method: existing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (response.status === 403) {
        setNotice({
          type: 'error',
          text: existing
            ? 'You do not have permission to update this bylaw amendment.'
            : 'You do not have permission to submit a bylaw amendment.',
        })
        return
      }
      if (!response.ok) {
        let detail = ''
        try {
          const body = await response.json()
          detail = typeof body?.message === 'string' ? body.message : ''
        } catch {
          detail = ''
        }
        const failed = existing
          ? 'The amendment could not be saved.'
          : 'The amendment could not be submitted.'
        setNotice({
          type: 'error',
          text: detail ? `${failed} ${detail}` : failed,
        })
        return
      }
      if (existing) {
        navigate('/members/forms/bylaw/submissions')
        return
      }
      const created = await response.json()
      if (!created?.id) {
        setNotice({ type: 'error', text: 'The amendment could not be submitted.' })
        return
      }
      setParagraphsOpen(false)
      setValues(EMPTY)
      setThanks(true)
      if (rememberBylawThanks()) {
        try {
          window.history.scrollRestoration = 'manual'
        } catch {
          // Older browsers can reject this; the reload still clears the form.
        }
        window.location.reload()
      } else {
        window.scrollTo(0, 0)
      }
    } catch {
      setNotice({
        type: 'error',
        text: existing
          ? 'The amendment could not be saved.'
          : 'The amendment could not be submitted.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!existing || !access.canUpdateDelete || !/^\d+$/.test(id)) return
    if (!window.confirm('Delete this bylaw amendment? This cannot be undone.')) return
    const session = readSession()
    const base = apiBaseUrl()
    if (!session?.accessToken || !base) {
      setNotice({ type: 'error', text: 'This bylaw amendment could not be deleted.' })
      return
    }
    setDeleting(true)
    setNotice(null)
    try {
      const response = await fetch(`${base}/forms/bylaw/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (response.status === 403) {
        setNotice({ type: 'error', text: 'You do not have permission to delete this bylaw amendment.' })
        return
      }
      if (!response.ok) {
        setNotice({ type: 'error', text: 'This bylaw amendment could not be deleted.' })
        return
      }
      navigate('/members/forms/bylaw/submissions')
    } catch {
      setNotice({ type: 'error', text: 'This bylaw amendment could not be deleted.' })
    } finally {
      setDeleting(false)
    }
  }

  const fieldsLocked = existing && !access.canUpdateDelete
  const showSave = !existing || access.canUpdateDelete
  const showDelete = existing && access.canUpdateDelete

  if (existing && (recordStatus === 'loading' || access.loading)) {
    return (
      <section className="section members-panel members-bylaws">
        <div className="wrap">
          <Loader compact label="Loading bylaw amendment…" />
        </div>
      </section>
    )
  }

  if (existing && recordStatus === 'error') {
    return (
      <section className="section members-panel members-bylaws">
        <div className="wrap">
          <header className="members-panel__head members-panel__head--center">
            <p className="eyebrow">Members area</p>
            <h1>Appendix C, Proposed By-Law Amendment</h1>
          </header>
          <p className="bylaw-submissions__back">
            <Link to="/members/forms/bylaw/submissions">Back to submissions</Link>
          </p>
          <p className="members-panel__error" role="alert">
            {recordError}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="section members-panel members-bylaws">
      <div className="wrap">
        <header className="members-panel__head members-panel__head--center">
          <p className="eyebrow">Members area</p>
          <h1>Appendix C, Proposed By-Law Amendment</h1>
        </header>

        {existing ? (
          <p className="bylaw-submissions__back">
            <Link to="/members/forms/bylaw/submissions">Back to submissions</Link>
          </p>
        ) : null}

        <form className="bylaw-form" onSubmit={handleSubmit}>
          {thanks && !existing ? (
            <p className="bylaw-form__thanks" role="status">
              {BYLAW_THANKS}
            </p>
          ) : null}
          <BylawsDocument
            admin={access.isOrgAdmin}
            canViewSubmissions={access.canViewSubmissions}
            existing={existing}
            canUpdateDelete={access.canUpdateDelete}
            submitting={submitting}
            deleting={deleting}
            onDelete={handleDelete}
          />
          <fieldset className="bylaw-cite" disabled={fieldsLocked}>
            <legend>Existing by-law</legend>
            <div className="bylaw-row bylaw-row--cite">
              <CiteSelect
                label="Article #"
                name="article"
                value={values.article}
                onChange={chooseArticle}
                disabled={fieldsLocked}
                required={!fieldsLocked}
                options={bylaws.map((item) => ({ value: item.id, label: articleLabel(item) }))}
              />
              <CiteSelect
                label="Section #"
                name="section"
                value={values.section}
                onChange={chooseSection}
                disabled={fieldsLocked || !article}
                required={!fieldsLocked}
                options={(article?.sections ?? []).map((item) => ({
                  value: item.id,
                  label: sectionLabel(item),
                }))}
              />
              <CiteSelect
                label="Sub Section #"
                name="subsection"
                value={values.subsection}
                onChange={chooseSubsection}
                disabled={fieldsLocked || !section}
                required={!fieldsLocked && Boolean(section) && subsections.length > 0 && !subsectionBlank}
                blank={subsectionBlank ? 'None' : null}
                options={subsections.map((item) => ({
                  value: item.id,
                  label: subsectionLabel(item),
                }))}
              />
            </div>
            <ParagraphChecks
              paragraphs={paragraphs}
              selected={values.paragraph}
              onChange={chooseParagraphs}
              disabled={
                fieldsLocked || !section || (subsections.length > 0 && !subsectionBlank && !values.subsection)
              }
              emptyLabel={
                fieldsLocked
                  ? paragraphSummary(paragraphs, values.paragraph)
                  : section && paragraphs.length === 0
                    ? 'None'
                    : 'Choose one…'
              }
              open={paragraphsOpen}
              onOpenChange={setParagraphsOpen}
              required={!fieldsLocked && paragraphs.length > 0}
            />
          </fieldset>

          <Field
            label="Reads"
            name="reads"
            rows={5}
            required={!fieldsLocked}
            disabled={fieldsLocked}
            value={values.reads}
            onChange={update('reads')}
          />
          <Field
            label="Change to read / add"
            name="change"
            rows={5}
            required={!fieldsLocked}
            disabled={fieldsLocked}
            value={values.change}
            onChange={update('change')}
          />
          <Field
            label="Rationale of Proposal"
            name="rationale"
            rows={4}
            required={!fieldsLocked}
            disabled={fieldsLocked}
            value={values.rationale}
            onChange={update('rationale')}
          />

          <div className="bylaw-row bylaw-row--pair">
            <Field
              label="Submitted By (1)"
              name="submitted-by-1"
              required={!fieldsLocked}
              disabled={fieldsLocked}
              value={values.submittedBy1}
              onChange={update('submittedBy1')}
            />
            <Field
              label="Submitted By (2)"
              name="submitted-by-2"
              disabled={fieldsLocked}
              value={values.submittedBy2}
              onChange={update('submittedBy2')}
            />
          </div>

          <div className="bylaw-row bylaw-row--pair">
            <Field
              label="Signature (1)"
              name="print-1"
              required={!fieldsLocked}
              disabled={fieldsLocked}
              value={values.print1}
              onChange={update('print1')}
            />
            <Field
              label="Signature (2)"
              name="print-2"
              disabled={fieldsLocked}
              value={values.print2}
              onChange={update('print2')}
            />
          </div>

          <fieldset className="bylaw-meetings">
            <Field
              label="This proposed amendment will be read and discussed at the General Meeting on:"
              name="meeting-first"
              type="date"
              value={values.firstReading}
              onChange={update('firstReading')}
            />
            <Field
              label="This proposed amendment will be read for the second time at the General Meeting on:"
              name="meeting-second"
              type="date"
              value={values.secondReading}
              onChange={update('secondReading')}
            />
            <Field
              label="This proposed amendment would be voted on at the General Meeting on:"
              name="meeting-vote"
              type="date"
              value={values.voteMeeting}
              onChange={update('voteMeeting')}
            />
          </fieldset>

          <fieldset className="bylaw-vote">
            <legend>For Voting Purposes Only</legend>
            <div className="bylaw-vote__body">
              <p className="bylaw-vote__prompt">Circle One</p>
              <div className="bylaw-choices">
                <label className="bylaw-choice">
                  <input
                    type="radio"
                    name="vote-choice"
                    value="YES"
                    checked={values.voteChoice === 'YES'}
                    onChange={update('voteChoice')}
                  />
                  YES
                </label>
                <label className="bylaw-choice">
                  <input
                    type="radio"
                    name="vote-choice"
                    value="NO"
                    checked={values.voteChoice === 'NO'}
                    onChange={update('voteChoice')}
                  />
                  NO
                </label>
                <label className="bylaw-choice">
                  <input
                    type="radio"
                    name="vote-choice"
                    value="ABSTAIN"
                    checked={values.voteChoice === 'ABSTAIN'}
                    onChange={update('voteChoice')}
                  />
                  ABSTAIN
                </label>
              </div>
              <div className="bylaw-choices">
                <label className="bylaw-choice">
                  <input
                    type="radio"
                    name="vote-result"
                    value="PASS"
                    checked={values.voteResult === 'PASS'}
                    onChange={update('voteResult')}
                  />
                  PASS
                </label>
                <label className="bylaw-choice">
                  <input
                    type="radio"
                    name="vote-result"
                    value="FAIL"
                    checked={values.voteResult === 'FAIL'}
                    onChange={update('voteResult')}
                  />
                  FAIL
                </label>
              </div>
              <Field
                label="DATE"
                name="vote-date"
                type="date"
                value={values.voteDate}
                onChange={update('voteDate')}
              />
            </div>
          </fieldset>

          {notice ? (
            <p
              className={
                notice.type === 'error' ? 'bylaw-form__status bylaw-form__status--error' : 'bylaw-form__status'
              }
              role={notice.type === 'error' ? 'alert' : 'status'}
            >
              {notice.text}
            </p>
          ) : null}

          {showSave || showDelete ? (
            <div className="bylaw-form__actions">
              {showDelete ? (
                <button
                  type="button"
                  className="bylaw-form__delete"
                  onClick={handleDelete}
                  disabled={deleting || submitting}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              ) : null}
              {showSave ? (
                <button type="submit" className="btn btn--navy bylaw-form__submit" disabled={submitting || deleting}>
                  {existing ? 'Save amendment' : 'Submit amendment'}
                </button>
              ) : null}
            </div>
          ) : null}
        </form>
      </div>
    </section>
  )
}
