import { directors, formRecipients, org } from '../data/site'
import { Field, Form, PageHero } from '../components/UI'
import { IconFacebook, IconInstagram, IconMail, IconPhone, IconPin } from '../components/Icons'
import './contact.css'

export default function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title="Get in touch"
        lead="We love our community — feel free to visit during normal business hours, call the station, or send us a message."
        image="/images/station.jpg"
      />

      {/* -------------------------------------------- Emergency reminder */}
      <div className="wrap">
        <p className="emergency-callout" role="note">
          <strong>This page is not monitored for emergencies.</strong> If you need an
          ambulance right now, hang up and dial <a href="tel:911">911</a>.
        </p>
      </div>

      {/* --------------------------------------------------- Contact info */}
      <section className="section section--tight">
        <div className="wrap grid grid--3">
          <div className="card contact-card">
            <span className="card__icon">
              <IconPhone />
            </span>
            <h3>Call us</h3>
            <p>
              <a href={org.phoneHref}>{org.phone}</a>
            </p>
            <p className="contact-card__note">
              Non-emergency business line. Officer extensions are listed on the{' '}
              <a href="/about#leadership">leadership page</a>.
            </p>
          </div>

          <div className="card contact-card">
            <span className="card__icon">
              <IconPin />
            </span>
            <h3>Visit the station</h3>
            <p>
              <a href={org.mapsUrl} target="_blank" rel="noreferrer">
                {org.station.street}
                <br />
                {org.station.city}, {org.station.state} {org.station.zip}
              </a>
            </p>
            <p className="contact-card__note">Mailing address: {org.mailing.full}</p>
          </div>

          <div className="card contact-card">
            <span className="card__icon">
              <IconFacebook />
            </span>
            <h3>Follow along</h3>
            <p className="contact-card__socials">
              <a href={org.facebook} target="_blank" rel="noreferrer">
                <IconFacebook /> Facebook
              </a>
              <a href={org.instagram} target="_blank" rel="noreferrer">
                <IconInstagram /> Instagram
              </a>
            </p>
            <p className="contact-card__note">
              Event photos, recruitment news, and fundraiser announcements.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Form + map */}
      <section className="section">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Drop us a line</span>
            <h2>Send a message</h2>
            <p className="lead">
              General questions, compliments about a crew, billing questions, or anything
              else. We read every one.
            </p>
            <Form
              name="General contact"
              subject="Website contact form"
              to={formRecipients.generalContact.to}
              submitLabel="Send message"
            >
              <Field label="Name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Phone number" name="phone" type="tel" />
              <Field
                label="What is this about?"
                name="topic"
                options={[
                  'General question',
                  'Membership / volunteering',
                  'CPR or first aid class',
                  'Event stand-by request',
                  'Donation or fundraiser',
                  'Compliment or concern about a call',
                  'Something else',
                ]}
                required
              />
              <Field label="Message" name="message" rows={6} required />
            </Form>
          </div>

          <div>
            <h3>Find us</h3>
            <div className="map-embed">
              <iframe
                title={`Map showing ${org.name} at ${org.station.full}`}
                src={org.mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <p>
              <a className="btn btn--outline btn--sm" href={org.mapsUrl} target="_blank" rel="noreferrer">
                Get directions
              </a>
            </p>

            <h3 className="contact__officers-head">Reach an officer directly</h3>
            <ul className="officer-list">
              {directors.map((d) => (
                <li key={d.email}>
                  <span className="officer-list__role">{d.role}</span>
                  <a href={`mailto:${d.email}`}>
                    <IconMail /> {d.email}
                  </a>
                  <a href={`${org.phoneHref},${d.ext}`}>
                    <IconPhone /> ext. {d.ext}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
