import {
  adultBenefits,
  adultRequirements,
  membershipCommittee,
  org,
  studentAdvisors,
  studentFaqs,
} from '../data/site'
import { Accordion, Field, Form, PageHero, PersonCard } from '../components/UI'
import { IconArrow } from '../components/Icons'
import './volunteer.css'

// Both membership tracks used to be separate top-level tabs. They answer the
// same question ("how do I join?"), so they live on one page with a jump menu.
const TRACKS = [
  {
    id: 'adult',
    label: 'Adult membership',
    detail: '18+ and a high school graduate',
  },
  {
    id: 'student',
    label: 'Student & youth program',
    detail: 'Ages 14–18, still in high school',
  },
]

export default function Volunteer() {
  return (
    <>
      <PageHero
        eyebrow="Become a member"
        title="Join our family"
        lead="We are accepting applications right now. You do not need any medical experience to start — we provide the training, the uniform, and the certifications, at no cost to you."
        image="/images/youth-group.jpg"
      />

      {/* --------------------------------------------- Track chooser */}
      <section className="section section--tight">
        <div className="wrap">
          <p className="track-intro">Two ways to join. Pick the one that fits you:</p>
          <div className="track-picker">
            {TRACKS.map((t) => (
              <a key={t.id} className="track-picker__item" href={`#${t.id}`}>
                <span className="track-picker__label">{t.label}</span>
                <span className="track-picker__detail">{t.detail}</span>
                <span className="track-picker__arrow">
                  <IconArrow />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Adult membership */}
      <section className="section section--alt" id="adult">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Adult membership</span>
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
                <p>
                  Questions before you apply? Talk to{' '}
                  {membershipCommittee.contact.name} on the membership committee.
                </p>
                <PersonCard
                  name={membershipCommittee.contact.name}
                  cert={membershipCommittee.contact.cert}
                  ext={membershipCommittee.contact.ext}
                  email={membershipCommittee.contact.email}
                />
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
            <h2>Adult application inquiry</h2>
            <p className="lead">
              Fill this out and a member of the membership committee will reach out to you.
            </p>
            <Form
              name="Adult membership inquiry"
              subject="Adult membership inquiry"
              submitLabel="Submit application"
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
              submitLabel="Submit application"
            >
              <Field label="Student's name" name="studentName" required />
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
    </>
  )
}
