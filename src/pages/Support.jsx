import { Link } from 'react-router-dom'
import { donationUses, fundraiser, org } from '../data/site'
import { CtaBand, PageHero } from '../components/UI'
import { IconArrow, IconHeart } from '../components/Icons'
import './support.css'

export default function Support() {
  return (
    <>
      <PageHero
        eyebrow="Support us"
        title="Donate to the volunteers of Shirley"
        lead="Every member of this agency is a volunteer. Your donation does not pay salaries — it buys the equipment, training, and supplies that go out the door on every call."
        image="/images/ambulance.jpg"
      />

      {/* ---------------------------------------------------- Donate */}
      <section className="section">
        <div className="wrap split">
          <div className="prose">
            <span className="eyebrow">Make a donation</span>
            <h2>Where your money goes</h2>
            <p>
              We are a non-profit organization serving the Shirley ambulance tax district.
              Donations are processed securely through our online giving platform, and you can
              give once or set up a recurring gift.
            </p>
            <ul className="use-list">
              {donationUses.map((u) => (
                <li key={u.amount}>
                  <span className="use-list__amount">{u.amount}</span>
                  <span>{u.body}</span>
                </li>
              ))}
            </ul>
            <a
              className="btn btn--primary btn--lg"
              href={org.donateUrl}
              target="_blank"
              rel="noreferrer"
            >
              <IconHeart /> Donate now
            </a>
            <p className="support__fineprint">
              Prefer to send a check? Mail it to {org.name}, {org.mailing.full}.
            </p>
          </div>

          <aside className="donate-card">
            <img src="/images/shield.png" alt="" className="donate-card__patch" />
            <h3>Other ways to help</h3>
            <ul className="checklist">
              <li>
                <a href="/volunteer">Volunteer your time</a> — our most valuable donation
              </li>
              {fundraiser.active && (
                <li>
                  Buy a ticket for the <Link to="/fundraiser">{fundraiser.name}</Link>
                </li>
              )}
              <li>
                <a href={org.facebook} target="_blank" rel="noreferrer">
                  Follow and share us on Facebook
                </a>
              </li>
              <li>
                Ask your employer about matching gifts for non-profit donations
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* Short teaser so /support#fundraiser still lands somewhere useful. */}
      {fundraiser.active && (
        <section className="section section--alt" id="fundraiser">
          <div className="wrap">
            <div className="section__head">
              <span className="eyebrow">Happening now</span>
              <h2>{fundraiser.name}</h2>
              <p className="lead">{fundraiser.blurb}</p>
            </div>
            <Link className="btn btn--primary" to="/fundraiser">
              See the prizes <IconArrow />
            </Link>
          </div>
        </section>
      )}

      <CtaBand
        eyebrow="Give time instead"
        title="Money helps. People help more."
        body="If you have twelve hours a week, we will turn you into an EMT at no cost to you."
        primary={{ to: '/volunteer', label: 'Become a volunteer' }}
        secondary={{ to: '/contact', label: 'Ask a question' }}
      />
    </>
  )
}
