import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { org, stats } from '../data/site'
import { IconArrow, IconChevron, IconX } from './Icons'
import './ui.css'

/* ------------------------------------------------------------------ */
/* Page header used at the top of every interior page                  */
/* ------------------------------------------------------------------ */
export function PageHero({ eyebrow, title, lead, image, imageAlt = '' }) {
  return (
    <section className="page-hero">
      {image && (
        <div className="page-hero__bg">
          <img src={image} alt={imageAlt} />
        </div>
      )}
      <div className="wrap page-hero__inner">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {lead && <p className="lead page-hero__lead">{lead}</p>}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Statistics band                                                     */
/* ------------------------------------------------------------------ */
export function StatBand({ items = stats }) {
  return (
    <section className="stat-band">
      <div className="wrap">
        <dl className="stat-band__grid">
          {items.map((s) => (
            <div key={s.label} className="stat">
              <dt className="stat__value">{s.value}</dt>
              <dd className="stat__label">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Accessible accordion (used for the student program FAQ)             */
/* ------------------------------------------------------------------ */
function AccordionItem({ q, a, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <div className={`accordion__item${open ? ' is-open' : ''}`}>
      <h3 className="accordion__heading">
        <button
          type="button"
          className="accordion__trigger"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-trigger`}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{q}</span>
          <IconChevron className="accordion__chevron" />
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        className="accordion__panel"
        hidden={!open}
      >
        <p>{a}</p>
      </div>
    </div>
  )
}

export function Accordion({ items }) {
  return (
    <div className="accordion">
      {items.map((item, i) => (
        <AccordionItem key={item.q} {...item} defaultOpen={i === 0} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Photo gallery with a lightbox                                       */
/* ------------------------------------------------------------------ */
export function Gallery({ photos }) {
  const [active, setActive] = useState(null)
  const isOpen = active !== null

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setActive(null)
      if (e.key === 'ArrowRight') setActive((i) => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setActive((i) => (i - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, photos.length])

  return (
    <>
      <ul className="gallery">
        {photos.map((p, i) => (
          <li key={p.src}>
            <button
              type="button"
              className="gallery__tile"
              onClick={() => setActive(i)}
              aria-label={`View larger: ${p.caption}`}
            >
              <img src={p.src} alt={p.alt} loading="lazy" />
              <span className="gallery__caption">{p.caption}</span>
            </button>
          </li>
        ))}
      </ul>

      {isOpen && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={photos[active].caption}
          onClick={() => setActive(null)}
        >
          <button type="button" className="lightbox__close" onClick={() => setActive(null)}>
            <IconX />
            <span className="visually-hidden">Close</span>
          </button>
          <figure className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
            <img src={photos[active].src} alt={photos[active].alt} />
            <figcaption>
              {photos[active].caption}
              {photos[active].credit && (
                <span className="lightbox__credit"> — {photos[active].credit}</span>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Person card (directors, advisors, committee)                        */
/* ------------------------------------------------------------------ */
export function PersonCard({ name, cert, role, ext, email }) {
  return (
    <div className="person">
      <div className="person__top">
        <p className="person__name">
          {name}
          {cert && <span className="person__cert">{cert}</span>}
        </p>
        {role && <p className="person__role">{role}</p>}
      </div>
      {(ext || email) && (
        <ul className="person__contact">
          {ext && (
            <li>
              <a href={`${org.phoneHref},${ext}`}>
                {org.phone} <span className="person__ext">ext. {ext}</span>
              </a>
            </li>
          )}
          {email && (
            <li>
              <a href={`mailto:${email}`}>{email}</a>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Closing call-to-action band, reused across pages                    */
/* ------------------------------------------------------------------ */
export function CtaBand({
  eyebrow = 'Volunteers needed',
  title = 'Have what it takes?',
  body = 'We are accepting applications for membership right now. No experience required — we train you, and we cover the cost.',
  primary = { to: '/volunteer', label: 'Apply to volunteer' },
  secondary = { href: org.donateUrl, label: 'Donate instead' },
}) {
  return (
    <section className="cta-band">
      <div className="wrap cta-band__inner">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p className="cta-band__body">{body}</p>
        </div>
        <div className="btn-row cta-band__actions">
          {primary &&
            (primary.to ? (
              <Link className="btn btn--primary" to={primary.to}>
                {primary.label} <IconArrow />
              </Link>
            ) : (
              <a className="btn btn--primary" href={primary.href} target="_blank" rel="noreferrer">
                {primary.label} <IconArrow />
              </a>
            ))}
          {secondary &&
            (secondary.to ? (
              <Link className="btn btn--ghost-light" to={secondary.to}>
                {secondary.label}
              </Link>
            ) : (
              <a
                className="btn btn--ghost-light"
                href={secondary.href}
                target="_blank"
                rel="noreferrer"
              >
                {secondary.label}
              </a>
            ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/*                                                                     */
/* The original site used GoDaddy's built-in form handler. There is no */
/* backend here, so each form posts to whatever endpoint is configured */
/* in VITE_FORM_ENDPOINT (Formspree, Netlify Forms, etc.) and falls    */
/* back to a mailto: draft so the form is never a dead end.            */
/* ------------------------------------------------------------------ */
const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT || ''

export function Field({ label, name, type = 'text', required = false, options, rows, help }) {
  const id = `f-${name}`
  const common = { id, name, required, 'aria-describedby': help ? `${id}-help` : undefined }

  return (
    <p className="field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {options ? (
        <select {...common} defaultValue="">
          <option value="" disabled>
            Choose one…
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : rows ? (
        <textarea {...common} rows={rows} />
      ) : (
        <input {...common} type={type} />
      )}
      {help && (
        <span className="field__help" id={`${id}-help`}>
          {help}
        </span>
      )}
    </p>
  )
}

/** Multiple file picker that lists the chosen filenames under the input. */
export function FileField({
  label,
  name,
  required = false,
  accept = 'application/pdf',
  multiple = false,
  help,
}) {
  const id = `f-${name}`
  const [files, setFiles] = useState([])

  return (
    <p className="field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type="file"
        required={required}
        accept={accept}
        multiple={multiple}
        aria-describedby={help ? `${id}-help` : undefined}
        onChange={(e) => setFiles([...e.target.files])}
      />
      {files.length > 0 && (
        <ul className="field__files">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}`}>{f.name}</li>
          ))}
        </ul>
      )}
      {help && (
        <span className="field__help" id={`${id}-help`}>
          {help}
        </span>
      )}
    </p>
  )
}

export function Form({
  name,
  subject,
  to,
  cc = [],
  submitLabel = 'Send',
  children,
  note,
  offlineMessage,
  validate,
}) {
  const [state, setState] = useState('idle') // idle | sending | sent | offline | error
  const [validationError, setValidationError] = useState(null)
  const ccList = (cc || []).filter(Boolean)

  function runValidate(form) {
    if (!validate) return null
    const message = validate(new FormData(form))
    setValidationError(message || null)
    return message || null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (runValidate(e.currentTarget)) return
    const data = new FormData(e.currentTarget)
    data.append('_form', name)
    data.append('_subject', subject || name)
    // Recorded on the submission so the provider can route on it (and so the
    // intended recipients are visible even if it cannot).
    if (to) data.append('_to', to)
    if (ccList.length) data.append('_cc', ccList.join(','))

    const hasFiles = [...data.values()].some((v) => v instanceof File && v.size > 0)

    // No endpoint configured: hand off to the visitor's mail client so the
    // message still reaches the agency rather than vanishing. File inputs
    // cannot travel through mailto, so those forms show offlineMessage instead.
    if (!FORM_ENDPOINT) {
      if (hasFiles || offlineMessage) {
        setState('offline')
        return
      }
      const body = [...data.entries()]
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
      const params = new URLSearchParams()
      if (ccList.length) params.set('cc', ccList.join(','))
      params.set('subject', subject || name)
      params.set('body', body)
      window.location.href = `mailto:${encodeURIComponent(to || '')}?${params.toString()}`
      setState('sent')
      return
    }

    setState('sending')
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })
      setState(res.ok ? 'sent' : 'error')
      if (res.ok) e.target.reset()
    } catch {
      setState('error')
    }
  }

  if (state === 'sent' || state === 'offline') {
    return (
      <div className="form-status form-status--ok" role="status">
        {state === 'offline' ? (
          <>
            <h3>Thanks — one more step.</h3>
            <p>{offlineMessage}</p>
          </>
        ) : (
          <>
            <h3>Thank you — we got it.</h3>
            <p>
              A member of our team will be in touch. If you need an answer sooner, call us at{' '}
              <a href={org.phoneHref}>{org.phone}</a>.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <form
      className="form"
      onSubmit={handleSubmit}
      onChange={validate ? (e) => runValidate(e.currentTarget) : undefined}
      noValidate={false}
    >
      {children}
      {validationError && (
        <p className="form-status form-status--err form-status--tag" role="alert">
          {validationError}
        </p>
      )}
      {note && <p className="form__note">{note}</p>}
      <button type="submit" className="btn btn--primary" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : submitLabel}
      </button>
      {state === 'error' && (
        <p className="form-status form-status--err" role="alert">
          Something went wrong sending that. Please call us at{' '}
          <a href={org.phoneHref}>{org.phone}</a> instead.
        </p>
      )}
      <p className="form__required-note">
        <span aria-hidden="true">*</span> Required field
      </p>
    </form>
  )
}
