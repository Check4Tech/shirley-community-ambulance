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
            <img src="/images/patch.jpg" alt="" className="donate-card__patch" />
            <h3>Other ways to help</h3>
            <ul className="checklist">
              <li>
                <a href="/volunteer">Volunteer your time</a> — our most valuable donation
              </li>
              <li>
                Buy a ticket for the <a href="#fundraiser">{fundraiser.name}</a>
              </li>
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

      {/* ------------------------------------------------- Fundraiser */}
      {fundraiser.active && (
        <section className="section section--alt" id="fundraiser">
          <div className="wrap">
            <div className="section__head">
              <span className="eyebrow">Happening now</span>
              <h2>{fundraiser.name}</h2>
              <p className="lead">{fundraiser.blurb}</p>
            </div>

            <div className="raffle">
              <figure className="raffle__poster media-figure">
                <img
                  src="/images/raffle.png"
                  alt={`Promotional poster for ${fundraiser.name}.`}
                  loading="lazy"
                />
              </figure>

              <div className="raffle__body">
                <p className="raffle__odds">
                  <strong>Only {fundraiser.ticketCount} tickets</strong> are being sold.
                </p>
                <div className="grid grid--2 raffle__prizes">
                  {fundraiser.prizes.map((p) => (
                    <article key={p.title} className="prize">
                      <img src={p.image} alt={p.alt} loading="lazy" />
                      <div className="prize__body">
                        <h3>{p.title}</h3>
                        <p>{p.body}</p>
                      </div>
                    </article>
                  ))}
                </div>
                <a
                  className="btn btn--primary"
                  href={fundraiser.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {fundraiser.ctaLabel} <IconArrow />
                </a>
              </div>
            </div>
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
