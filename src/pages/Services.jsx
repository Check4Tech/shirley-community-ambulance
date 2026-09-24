import { cprCourses, org, standbyUnits } from '../data/site'
import { CtaBand, Field, Form, PageHero } from '../components/UI'
import { IconArrow } from '../components/Icons'
import './services.css'

export default function Services() {
  return (
    <>
      <PageHero
        eyebrow="Community services"
        title="What we can do for you"
        lead="Beyond answering 911 calls, we teach the community to save lives and we cover local events. Both are requested right here."
        image="/images/hero-crew.jpg"
      />

      {/* --------------------------------------------------- Jump links */}
      <section className="section section--tight">
        <div className="wrap service-jump">
          <a className="service-jump__item" href="#cpr">
            <span>CPR &amp; first aid classes</span>
            <IconArrow />
          </a>
          <a className="service-jump__item" href="#standby">
            <span>Event stand-by requests</span>
            <IconArrow />
          </a>
        </div>
      </section>

      {/* -------------------------------------------------- CPR courses */}
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

      <section className="section">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Interest form</span>
            <h2>Set up a class</h2>
            <p className="lead">
              Tell us a little about your group and a member of our team will get back to you
              with dates and availability.
            </p>
            <Form name="CPR course interest" subject="CPR course interest" submitLabel="Send request">
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

      {/* ---------------------------------------------- Stand-by requests */}
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

      <section className="section">
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
                label="Estimated attendance"
                name="attendance"
                type="number"
                help="A rough number is fine — it helps us size the assignment."
              />
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

      <CtaBand />
    </>
  )
}
