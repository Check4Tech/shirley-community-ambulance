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
import { CtaBand, Gallery, PageHero, PersonCard, StatBand } from '../components/UI'
import './about.css'

export default function About() {
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
            <figcaption>Our fleet at quarters on Plymouth Place.</figcaption>
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
              Reach any officer directly on the main line at{' '}
              <a href={org.phoneHref}>{org.phone}</a> using their extension.
            </p>
          </div>
          <div className="grid grid--3">
            {directors.map((d) => (
              <PersonCard key={d.email} {...d} />
            ))}
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
            <PersonCard
              name={membershipCommittee.contact.name}
              cert={membershipCommittee.contact.cert}
              role="Membership contact"
              ext={membershipCommittee.contact.ext}
              email={membershipCommittee.contact.email}
            />
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
