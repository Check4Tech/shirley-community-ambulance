import { useLocation, useNavigate } from 'react-router-dom'
import {
  adultBenefits,
  adultRequirements,
  formRecipients,
  membershipCommittee,
  org,
  studentAdvisors,
  studentFaqs,
} from '../data/site'
import { Accordion, Field, Form, PageHero } from '../components/UI'
import StructuredData from '../components/StructuredData'
import { IconArrow } from '../components/Icons'
import './volunteer.css'

// The student-program Q&A is the most "askable" content on the site, so it is
// published as FAQPage markup for search results and AI answer engines.
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: studentFaqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

// Both membership tracks answer the same question ("how do I join?"), so they
// live on one page as selectable tabs — same pattern as /services.
const TRACKS = [
  {
    id: 'adult',
    hashes: ['adult', 'adult-apply', 'membership'],
    label: 'Membership',
    detail: '18+ and a high school graduate',
  },
  {
    id: 'student',
    hashes: ['student', 'student-apply'],
    label: 'Student & youth program',
    detail: 'Ages 14–18, still in high school',
  },
]

function tabFromHash(hash) {
  const id = (hash || '').replace(/^#/, '')
  return TRACKS.find((t) => t.hashes.includes(id))?.id || 'adult'
}

function ageFromDob(dob) {
  if (!dob) return null
  const birth = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const month = today.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

function needsStudentApplication(formData) {
  const eligible = formData.get('eligible')
  const age = ageFromDob(formData.get('dob'))
  return eligible === 'No' || (age !== null && age < 18)
}

function membershipValidate(formData) {
  if (!needsStudentApplication(formData)) return null
  return (
    <>
      Please submit a student application.{' '}
      <a href="#student">Go to the student &amp; youth program</a>
    </>
  )
}

export default function Volunteer() {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const tab = tabFromHash(hash)

  function selectTab(id) {
    navigate({ hash: id }, { replace: true })
  }

  return (
    <>
      <StructuredData id="ld-faq" data={faqSchema} />
      <PageHero
        eyebrow="Become a member"
        title="Join Today"
        lead="We are accepting applications right now. You do not need any medical experience to start — we provide the training, the uniform, and the certifications, at no cost to you."
        image="/images/youth-group.jpg"
      />

      {/* --------------------------------------------- Track chooser */}
      <section className="section section--tight">
        <div className="wrap">
          <p className="track-intro">Two ways to join. Pick the one that fits you:</p>
          <div className="track-picker" role="tablist" aria-label="Ways to join">
            {TRACKS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                className={`track-picker__item${tab === t.id ? ' is-active' : ''}`}
                onClick={() => selectTab(t.id)}
              >
                <span className="track-picker__label">{t.label}</span>
                <span className="track-picker__detail">{t.detail}</span>
                <span className="track-picker__arrow">
                  <IconArrow />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'adult' && <MembershipPanel />}
        {tab === 'student' && <StudentPanel />}
      </div>
    </>
  )
}

function MembershipPanel() {
  return (
    <>
      {/* ------------------------------------------------ Adult membership */}
      <section className="section section--alt" id="adult">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Membership</span>
            <h2>Interested in joining?</h2>
            <p className="lead">
              Full-time adult members are the backbone of the agency. Here is exactly what you
              get and exactly what we ask of you.
            </p>
          </div>

          <div className="grid grid--2 volunteer__cols">
            <div className="panel">
              <h3>What&rsquo;s the benefit?</h3>
              <ul className="checklist">
                {adultBenefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="panel panel--accent">
              <h3>What you&rsquo;re required to do</h3>
              <p className="panel__sub">Full-time adult member</p>
              <ul className="checklist">
                {adultRequirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="panel__foot">
                <p>Questions before you apply? Talk to our membership committee.</p>
                <ul className="contact-lines">
                  <li>
                    <a href={`${org.phoneHref},${membershipCommittee.contact.ext}`}>
                      {org.phone} <span className="contact-lines__ext">ext. {membershipCommittee.contact.ext}</span>
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
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- Adult application */}
      <section className="section" id="adult-apply">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Apply</span>
            <h2>Membership application inquiry</h2>
            <p className="lead">
              Fill this out and a member of the membership committee will reach out to you.
            </p>
            <Form
              name="Membership inquiry"
              subject="Membership inquiry"
              to={formRecipients.adultMembership.to}
              submitLabel="Submit application"
              validate={membershipValidate}
            >
              <Field label="First and last name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Phone number" name="phone" type="tel" required />
              <Field label="What town do you live in?" name="town" required />
              <Field
                label="Are you over 18 and a high school graduate?"
                name="eligible"
                options={['Yes', 'No']}
                required
              />
              <Field label="Date of birth" name="dob" type="date" required />
              <Field
                label="Relevant certifications or experience"
                name="certifications"
                rows={4}
                help="Optional. Tell us about any EMS, medical, or first-aid training you already hold."
              />
            </Form>
          </div>

          <aside className="visit-card">
            <h3>Better yet, see us in person</h3>
            <p>
              Come down to headquarters and fill out an application on the spot. We would
              rather meet you than read a form.
            </p>
            <p className="visit-card__address">
              <strong>{org.name}</strong>
              <br />
              {org.station.full}
            </p>
            <p>
              <a className="btn btn--outline btn--sm" href={org.phoneHref}>
                Call {org.phone}
              </a>
            </p>
            <p className="visit-card__mail">Mail: {org.mailing.full}</p>
          </aside>
        </div>
      </section>
    </>
  )
}

function StudentPanel() {
  return (
    <>
      {/* ------------------------------------------------- Student program */}
      <section className="section section--navy" id="student">
        <div className="wrap split split--center">
          <div className="prose">
            <span className="eyebrow">Student &amp; youth program</span>
            <h2>Start your medical career in high school</h2>
            <p>
              Our student program was built for high schoolers interested in pursuing a career
              in the medical field. Student members ride the ambulance alongside veteran EMS
              providers, getting hands-on training and education that is almost impossible to
              find at their age — while earning volunteer credit for college applications.
            </p>
            <p>
              <strong>The program is completely free.</strong> Uniforms, CPR certification,
              and training are all covered, and we will pay for an EMT course through Suffolk
              County EMS when a student is ready.
            </p>
            <a className="btn btn--primary" href="#student-apply">
              Apply to the program <IconArrow />
            </a>
          </div>
          <figure className="media-figure">
            <img
              src="/images/students.jpg"
              alt="Student program members in blue uniforms lined up in front of the Shirley Community Ambulance station between two ambulances."
              loading="lazy"
            />
          </figure>
        </div>
      </section>

      {/* --------------------------------------------- Student application */}
      <section className="section section--alt" id="student-apply">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Apply</span>
            <h2>Student application</h2>
            <p className="lead">
              Fill this out and a member of the student committee will be in contact as soon
              as possible.
            </p>
            <Form
              name="Student program application"
              subject="Student/youth program application"
              to={formRecipients.studentProgram.to}
              submitLabel="Submit application"
            >
              <Field label="Student first name" name="studentFirstName" required />
              <Field label="Student last name" name="studentLastName" required />
              <Field label="Parent or guardian's name" name="guardianName" required />
              <Field label="Student's email" name="studentEmail" type="email" required />
              <Field label="Parent or guardian's email" name="guardianEmail" type="email" required />
              <Field label="Phone number" name="phone" type="tel" required />
              <Field label="Student's date of birth" name="dob" type="date" required />
              <Field
                label="Graduation year and high school"
                name="school"
                required
                help="For example: 2028, William Floyd High School"
              />
              <Field label="What town do you live in?" name="town" required />
              <Field
                label="Can you commit to one 3–4 hour shift per week and one meeting or training per month?"
                name="commitment"
                options={['Yes', 'No']}
                required
              />
            </Form>
          </div>

          <aside>
            <h3>Our student advisors</h3>
            <p className="volunteer__muted">
              These members run the program day to day. For questions, call{' '}
              <a href={`${org.phoneHref},21`}>{org.phone} ext. 21</a>.
            </p>
            <ul className="name-list">
              {studentAdvisors.map((a) => (
                <li key={a.name}>
                  {a.name} <span className="name-list__cert">{a.cert}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------------ Student FAQ */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">For parents and students</span>
            <h2>Frequently asked questions</h2>
          </div>
          <Accordion items={studentFaqs} />
        </div>
      </section>
    </>
  )
}
