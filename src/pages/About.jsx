import { useEffect, useState } from 'react'
import {
  aboutCopy,
  capabilities,
  directors,
  gallery,
  medicalDirectors,
  membershipCommittee,
  org,
  partners,
} from '../data/site'
import { BOARD_POSITIONS, boardSeatsFrom } from '../data/boardPositions'
import { apiBaseUrl } from '../auth/session'
import { CtaBand, Gallery, PageHero, PersonCard, StatBand } from '../components/UI'
import './about.css'

function seatOf(role) {
  if (role === 'Chief of Operations') return 'Chief'
  return BOARD_POSITIONS.includes(role) ? role : ''
}

function personName(name) {
  if (typeof name !== 'string' || name !== name.toUpperCase()) return name
  return name.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toUpperCase())
}

const previousBoard = directors.map((director) => ({
  key: director.email,
  name: director.name,
  cert: director.cert,
  role: director.role,
  ext: director.ext,
  email: director.email,
  seat: seatOf(director.role),
}))

export default function About() {
  const [board, setBoard] = useState(previousBoard)
  const [fromApi, setFromApi] = useState(false)

  useEffect(() => {
    const base = apiBaseUrl()
    if (!base) return undefined
    let cancelled = false
    fetch(`${base}/board`, { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || payload == null) return
        const seats = boardSeatsFrom(payload).map((seat) => ({
          key: seat.position,
          name: personName(seat.fullName),
          role: seat.position,
          seat: seat.position,
        }))
        setBoard(seats)
        setFromApi(true)
      })
      .catch(() => {
        if (!cancelled) {
          setBoard(previousBoard)
          setFromApi(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHero
        eyebrow="About us"
        title="A volunteer agency, since 1977"
        lead={aboutCopy.lead}
        image="/images/students.jpg"
      />

      <StatBand />

      {/* -------------------------------------------------------- The story */}
      <section className="section">
        <div className="wrap split split--center">
          <div className="prose">
            <span className="eyebrow">Our mission</span>
            <h2>Serving the Shirley ambulance tax district</h2>
            {aboutCopy.body.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <figure className="media-figure about__figure">
            <img
              src="/images/hero-crew.jpg"
              alt="Three Shirley Community Ambulance rigs parked under the station apparatus bay canopy."
              loading="lazy"
            />
            <figcaption>NYU Langone - Suffolk</figcaption>
          </figure>
        </div>
      </section>

      {/* ----------------------------------------------------- Capabilities */}
      <section className="section section--alt">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Level of care</span>
            <h2>What we provide</h2>
          </div>
          <div className="grid grid--4">
            {capabilities.map((c) => (
              <div key={c.title} className="card">
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Partners */}
      <section className="section section--navy">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Mutual aid</span>
            <h2>We work alongside</h2>
            <p className="lead">
              No agency handles a district alone. These are the partners we operate with on
              scenes across Suffolk County.
            </p>
          </div>
          <ul className="partner-list">
            {partners.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------ Leadership */}
      <section className="section" id="leadership">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Leadership</span>
            <h2>{new Date().getFullYear()} Board of Directors</h2>
            <p className="lead">
              {fromApi ? (
                <>
                  The officers currently holding these seats. Reach the agency on the main line at{' '}
                  <a href={org.phoneHref}>{org.phone}</a>.
                </>
              ) : (
                <>
                  Reach any officer directly on the main line at{' '}
                  <a href={org.phoneHref}>{org.phone}</a> using their extension.
                </>
              )}
            </p>
          </div>
          {/* DOM order is seniority order; the pentagon placement is purely
              visual, applied with CSS at >=1000px only. */}
          <div className="board">
            <span className="board__ring" aria-hidden="true" />
            <img className="board__shield" src="/images/shield.png" alt="" aria-hidden="true" />
            {board.map((person, index) => {
              const seat = BOARD_POSITIONS.indexOf(person.seat)
              return (
                <div
                  key={person.key}
                  className={`board__node board__node--${seat >= 0 ? seat + 1 : index + 1}`}
                >
                  <PersonCard
                    name={person.name}
                    cert={person.cert}
                    role={person.role}
                    ext={person.ext}
                    email={person.email}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------- Committee + med control */}
      <section className="section section--alt">
        <div className="wrap grid grid--2 about__two-col">
          <div>
            <h3>Membership Committee</h3>
            <p className="about__muted">
              Questions about joining? These are the people who will walk you through it.
            </p>
            <ul className="name-list">
              {membershipCommittee.members.map((m) => (
                <li key={m.name}>
                  {m.name} <span className="name-list__cert">{m.cert}</span>
                </li>
              ))}
            </ul>
            <div className="committee-contact">
              <p className="committee-contact__label">Contact the committee</p>
              <ul className="contact-lines">
                <li>
                  <a href={`${org.phoneHref},${membershipCommittee.contact.ext}`}>
                    {org.phone}{' '}
                    <span className="contact-lines__ext">
                      ext. {membershipCommittee.contact.ext}
                    </span>
                  </a>
                </li>
                <li>
                  <a href={`mailto:${membershipCommittee.contact.email}`}>
                    {membershipCommittee.contact.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div>
            <h3>Medical Directors</h3>
            <p className="about__muted">
              Our physician medical directors provide clinical oversight and protocol
              authority for every provider on our rigs.
            </p>
            <ul className="name-list">
              {medicalDirectors.map((m) => (
                <li key={m.name}>
                  {m.name} <span className="name-list__cert">{m.cert}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Gallery */}
      <section className="section" id="gallery">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Photo gallery</span>
            <h2>The agency at work</h2>
            <p className="lead">
              Select any photo to view it larger. Use the arrow keys to move between images.
            </p>
          </div>
          <Gallery photos={gallery} />
        </div>
      </section>

      <CtaBand />
    </>
  )
}
