import { useLocation, useNavigate } from 'react-router-dom'
import { cprCourses, formRecipients, org, standbyUnits } from '../data/site'
import { CtaBand, Field, FileField, Form, PageHero } from '../components/UI'
import StructuredData from '../components/StructuredData'
import { IconArrow } from '../components/Icons'
import './services.css'

const TABS = [
  { id: 'cpr', hashes: ['cpr', 'cpr-form'], label: 'CPR & first aid classes' },
  { id: 'standby', hashes: ['standby', 'standby-form'], label: 'Event stand-by requests' },
  { id: 'records', hashes: ['records', 'records-form'], label: 'Records request' },
]

function tabFromHash(hash) {
  const id = (hash || '').replace(/^#/, '')
  return TABS.find((t) => t.hashes.includes(id))?.id || 'cpr'
}

const provider = {
  '@type': 'EmergencyService',
  name: org.name,
  telephone: '+1-631-399-5380',
  address: {
    '@type': 'PostalAddress',
    streetAddress: org.station.street,
    addressLocality: org.station.city,
    addressRegion: org.station.state,
    postalCode: org.station.zip,
    addressCountry: 'US',
  },
}

const servicesSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Service',
      name: 'Public CPR, AED and First Aid training',
      serviceType: 'CPR and first aid certification courses',
      provider,
      areaServed: { '@type': 'Place', name: 'Suffolk County, New York' },
      description:
        'American Heart Association CPR/AED, General First Aid, and BLS for Healthcare Providers courses taught by Shirley Community Ambulance instructors. Classes require a minimum of three people and some carry a fee.',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Courses offered',
        itemListElement: cprCourses.map((c) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: c.title, description: c.body },
        })),
      },
    },
    {
      '@type': 'Service',
      name: 'Event medical stand-by coverage',
      serviceType: 'Event EMS standby',
      provider,
      areaServed: { '@type': 'Place', name: 'Shirley ambulance tax district, New York' },
      description:
        'Ambulance, first responder, fire rehab, and bike team coverage for races, carnivals, sporting events, and large gatherings in the Shirley district.',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Available units',
        itemListElement: standbyUnits.map((u) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: u.title, description: u.body },
        })),
      },
    },
    {
      '@type': 'Service',
      name: 'Agency records request',
      serviceType: 'EMS records request',
      provider,
      areaServed: { '@type': 'Place', name: 'Shirley ambulance tax district, New York' },
      description:
        'Request a copy of an agency record from the Shirley Community Ambulance Secretary. Attach supporting PDFs when available.',
    },
  ],
}

export default function Services() {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const tab = tabFromHash(hash)

  function selectTab(id) {
    navigate({ hash: id }, { replace: true })
  }

  return (
    <>
      <StructuredData id="ld-services" data={servicesSchema} />
      <PageHero
        eyebrow="Community services"
        title="What we can do for you"
        lead="Beyond answering 911 calls, we teach the community to save lives, cover local events, and fulfill records requests."
        image="/images/hero-crew.jpg"
      />

      <section className="section section--tight">
        <div className="wrap">
          <div className="service-jump" role="tablist" aria-label="Service requests">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                className={`service-jump__item${tab === t.id ? ' is-active' : ''}`}
                onClick={() => selectTab(t.id)}
              >
                <span>{t.label}</span>
                <IconArrow />
              </button>
            ))}
          </div>
        </div>
      </section>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'cpr' && <CprPanel />}
        {tab === 'standby' && <StandbyPanel />}
        {tab === 'records' && <RecordsPanel />}
      </div>

      <CtaBand />
    </>
  )
}

function CprPanel() {
  return (
    <>
      <section className="section section--alt" id="cpr">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Public training</span>
            <h2>CPR &amp; first aid classes</h2>
            <p className="lead">
              Our department has over a dozen American Heart Association CPR, AED, and First
              Aid instructors. We teach your group at your schedule.
            </p>
          </div>

          <div className="grid grid--3">
            {cprCourses.map((c) => (
              <div key={c.title} className="card">
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>

          <p className="notice">
            All classes require a minimum of three people. Certain classes have fees applied —
            tell us what you need in the form below and we will confirm dates, availability,
            and any cost.
          </p>
        </div>
      </section>

      <section className="section" id="cpr-form">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Interest form</span>
            <h2>Set up a class</h2>
            <p className="lead">
              Tell us a little about your group and a member of our team will get back to you
              with dates and availability.
            </p>
            <Form
              name="CPR course interest"
              subject="CPR course interest"
              to={formRecipients.cprCourse.to}
              submitLabel="Send request"
            >
              <Field label="Name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Phone number" name="phone" type="tel" required />
              <Field
                label="How many people are looking to take a course?"
                name="headcount"
                type="number"
                required
                help="Minimum of three."
              />
              <Field
                label="What type of class are you looking for?"
                name="courseType"
                options={[
                  'CPR / AED',
                  'First Aid (General)',
                  'CPR / AED and First Aid',
                  'BLS for Healthcare Providers',
                  'Not sure — please advise',
                ]}
                required
              />
              <Field
                label="Has anyone in the group been certified or taken a CPR class before?"
                name="priorTraining"
                options={['Yes, all of us', 'Some of us', 'No, all first-timers']}
                required
              />
              <Field
                label="What days and times work best for your group?"
                name="availability"
                rows={3}
                required
              />
            </Form>
          </div>

          <aside className="contact-aside">
            <h3>Prefer to call?</h3>
            <p>
              Reach the station at <a href={org.phoneHref}>{org.phone}</a> and ask about
              public CPR courses.
            </p>
            <p className="contact-aside__address">
              <strong>{org.name}</strong>
              <br />
              {org.station.full}
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}

function StandbyPanel() {
  return (
    <>
      <section className="section section--navy" id="standby">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Event coverage</span>
            <h2>Stand-by requests</h2>
            <p className="lead">
              Running a race, a carnival, a game, or a large gathering in the district? We
              staff medical coverage for community events throughout the year.
            </p>
          </div>
          <ul className="unit-list">
            {standbyUnits.map((u) => (
              <li key={u.title}>
                <h3>{u.title}</h3>
                <p>{u.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" id="standby-form">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Request form</span>
            <h2>Request coverage for your event</h2>
            <p className="lead">
              Submit your details and our operations team will confirm availability. Please
              give us as much notice as you can.
            </p>
            <Form
              name="Stand-by request"
              subject="Event stand-by request"
              to={formRecipients.standby.to}
              cc={formRecipients.standby.cc}
              submitLabel="Send request"
            >
              <Field label="Name" name="name" required />
              <Field label="Organization" name="organization" />
              <Field label="Email" name="email" type="email" required />
              <Field label="Phone number" name="phone" type="tel" required />
              <Field label="Date of event" name="eventDate" type="date" required />
              <Field label="Event start and end time" name="eventTime" required />
              <Field label="Event location" name="location" required />
              <Field
                label="Units requested"
                name="units"
                rows={3}
                required
                help="For example: one BLS ambulance and two bike team members."
              />
            </Form>
          </div>

          <aside className="contact-aside">
            <h3>Available units</h3>
            <ul className="checklist contact-aside__units">
              {standbyUnits.map((u) => (
                <li key={u.title}>{u.title}</li>
              ))}
            </ul>
            <p>
              Not sure what you need? Call <a href={org.phoneHref}>{org.phone}</a> and we will
              help you work it out.
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}

function RecordsPanel() {
  const secretary = formRecipients.recordsRequest.to

  return (
    <>
      <section className="section section--alt" id="records">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Agency records</span>
            <h2>Records request</h2>
            <p className="lead">
              Need a copy of a patient care report or another agency record? Send the request
              to the Secretary and attach any supporting PDFs.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="records-form">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Request form</span>
            <h2>Request a record</h2>
            <p className="lead">
              Required fields are marked. PDFs travel with the request when the form service
              is connected; until then we will tell you how to send them.
            </p>
            <p className="notice">
              Unless this request is made by the patient themselves, all other records
              requests must be notarized.
            </p>
            <Form
              name="Records request"
              subject="Records request"
              to={secretary}
              submitLabel="Send request"
              offlineMessage={
                <>
                  This request will go to the Secretary once the form service is connected. For
                  now please call <a href={org.phoneHref}>{org.phone}</a> or email{' '}
                  <a href={`mailto:${secretary}`}>{secretary}</a> with your PDFs.
                </>
              }
            >
              <Field label="Business name" name="businessName" />
              <Field label="Name of the person requesting" name="requesterName" required />
              <Field label="Phone number" name="phone" type="tel" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Fax number" name="fax" type="tel" />
              <Field label="Request by date" name="neededBy" type="date" required />
              <FileField
                label="PDF attachments"
                name="attachments"
                accept="application/pdf"
                multiple
                help="PDF files only. You can attach more than one."
              />
            </Form>
          </div>

          <aside className="contact-aside">
            <h3>Prefer to call?</h3>
            <p>
              Reach the Secretary at <a href={org.phoneHref}>{org.phone}</a> or email{' '}
              <a href={`mailto:${secretary}`}>{secretary}</a>.
            </p>
            <p className="contact-aside__address">
              <strong>{org.name}</strong>
              <br />
              {org.station.full}
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}
