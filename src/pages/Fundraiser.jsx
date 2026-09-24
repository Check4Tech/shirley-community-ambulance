import { Link } from 'react-router-dom'
import { fundraiser, org } from '../data/site'
import { CtaBand, PageHero } from '../components/UI'
import { IconArrow } from '../components/Icons'
import './fundraiser.css'

export default function Fundraiser() {
  if (!fundraiser.active) {
    return (
      <>
        <PageHero
          eyebrow="Events"
          title="No campaign is running right now"
          lead="When we have an active raffle or fundraiser, it will live on this page. In the meantime, a donation still goes straight to equipment, training, and supplies."
          image="/images/ambulance.jpg"
        />
        <CtaBand
          eyebrow="Support the agency"
          title="Give what you can"
          body="Every member of this agency is dedicated to serving our community. Your donation does not pay salaries — it buys what rolls out the door."
          primary={{ to: '/support', label: 'Donate' }}
          secondary={{ to: '/volunteer', label: 'Become a volunteer' }}
        />
      </>
    )
  }

  return (
    <>
      <PageHero
        eyebrow="Happening now"
        title={fundraiser.name}
        lead={fundraiser.blurb}
        image={fundraiser.prizes[0].image}
        imageAlt={fundraiser.prizes[0].alt}
      />

      <section className="section">
        <div className="wrap">
          <div className="raffle">
            <figure className="raffle__poster media-figure">
              <img
                src="/images/raffle.png"
                alt={`Promotional poster for ${fundraiser.name}.`}
              />
            </figure>

            <div className="raffle__body">
              <p className="raffle__odds">
                <strong>Only {fundraiser.ticketCount} tickets</strong> are being sold.
              </p>
              <div className="grid grid--2 raffle__prizes">
                {fundraiser.prizes.map((p) => (
                  <article key={p.title} className="prize">
                    <img src={p.image} alt={p.alt} />
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
              <p className="fundraiser__cash">
                Rather give cash? <Link to="/support">Donate instead</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="Give time instead"
        title="Money helps. People help more."
        body="If you have twelve hours a week, we will turn you into an EMT at no cost to you."
        primary={{ to: '/volunteer', label: 'Become a volunteer' }}
        secondary={{ href: org.donateUrl, label: 'Donate instead' }}
      />
    </>
  )
}
