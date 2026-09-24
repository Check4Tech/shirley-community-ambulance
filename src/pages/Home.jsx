import { Link } from 'react-router-dom'
import { capabilities, fundraiser, gallery, org } from '../data/site'
import { CtaBand, Gallery, StatBand } from '../components/UI'
import {
  IconArrow,
  IconBolt,
  IconCalendar,
  IconGraduation,
  IconHeart,
  IconShield,
  IconTruck,
  IconUsers,
} from '../components/Icons'
import './home.css'

const CAPABILITY_ICONS = [IconBolt, IconShield, IconTruck, IconUsers]

// The three things a visitor actually comes here to do. On the old site these
// were buried behind a dropdown; here they are the first thing below the hero.
const ACTIONS = [
  {
    icon: IconUsers,
    title: 'Volunteer with us',
    body: 'No experience needed. We pay for your EMT training, uniforms, and certifications.',
    to: '/volunteer',
    cta: 'See what it takes',
  },
  {
    icon: IconHeart,
    title: 'Donate',
    body: 'We are funded by the community we serve. Every dollar buys equipment and training.',
    href: org.donateUrl,
    cta: 'Give today',
  },
  {
    icon: IconCalendar,
    title: 'Request a stand-by',
    body: 'Running an event in the district? Book ambulance, bike team, or rehab coverage.',
    to: '/services#standby',
    cta: 'Request coverage',
  },
]

export default function Home() {
  return (
    <>
      {/* ---------------------------------------------------------- Hero */}
      <section className="hero">
        <div className="hero__bg">
          <img
            src="/images/hero-crew.jpg"
            alt=""
            fetchpriority="high"
            width="1920"
            height="1080"
          />
        </div>
        <div className="wrap hero__inner">
          <p className="hero__kicker">Shirley, New York · Est. {org.foundedYear}</p>
          <h1 className="hero__title">
            Your neighbors,
            <br />
            on call 24/7.
          </h1>
          <p className="hero__lead">
            {org.name} is a volunteer, non-profit ambulance agency answering more than
            1,500 emergency calls a year for the Shirley ambulance tax district — with both
            Advanced and Basic Life Support.
          </p>
          <div className="btn-row hero__actions">
            <Link className="btn btn--primary" to="/volunteer">
              Become a volunteer <IconArrow />
            </Link>
            <a
              className="btn btn--ghost-light"
              href={org.donateUrl}
              target="_blank"
              rel="noreferrer"
            >
              Donate
            </a>
          </div>
        </div>
      </section>

      <StatBand />

      {/* ------------------------------------------------- Primary actions */}
      <section className="section">
        <div className="wrap">
          <div className="section__head section__head--center section__head--tight">
            <span className="eyebrow">How can we help?</span>
            <h2>Start here</h2>
          </div>
          <div className="grid grid--3">
            {ACTIONS.map(({ icon: Icon, title, body, to, href, cta }) => {
              const inner = (
                <>
                  <span className="card__icon">
                    <Icon />
                  </span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <span className="card__more">
                    {cta} <IconArrow />
                  </span>
                </>
              )
              return to ? (
                <Link key={title} className="card card--link action-card" to={to}>
                  {inner}
                </Link>
              ) : (
                <a
                  key={title}
                  className="card card--link action-card"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {inner}
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Fundraiser */}
      {fundraiser.active && (
        <section className="section fundraiser-strip">
          <div className="wrap split split--center">
            <div className="prose">
              <span className="eyebrow">Happening now</span>
              <h2>{fundraiser.name}</h2>
              <p>{fundraiser.blurb}</p>
              <Link className="btn btn--primary" to="/fundraiser">
                See the prizes <IconArrow />
              </Link>
            </div>
            <figure className="media-figure fundraiser-strip__figure">
              <img
                src={fundraiser.prizes[0].image}
                alt={fundraiser.prizes[0].alt}
                loading="lazy"
              />
            </figure>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ Who we are */}
      <section className="section section--alt">
        <div className="wrap split split--center">
          <div className="prose">
            <span className="eyebrow">Who we are</span>
            <h2>Run by the people who live here</h2>
            <p>
              Since {org.foundedYear} we have operated out of a single station on Plymouth
              Place, protecting a primarily residential district 24 hours a day, 365 days a
              year. Our members answer everything from motor vehicle accidents to cardiac
              arrests, and stand by at fires, sporting events, and community events all year.
            </p>
            <p>
              Every provider on our rigs is a volunteer. They spend hundreds — sometimes
              thousands — of hours a year training so that the ambulance that shows up at your
              door is staffed by someone who is genuinely ready.
            </p>
            <Link className="btn btn--outline" to="/about">
              More about the agency <IconArrow />
            </Link>
          </div>
          <figure className="media-figure home__about-figure">
            <img
              src="/images/youth-group.jpg"
              alt="Members of Shirley Community Ambulance gathered with a banner in front of an ambulance."
              loading="lazy"
            />
          </figure>
        </div>
      </section>

      {/* --------------------------------------------------- What we field */}
      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Capabilities</span>
            <h2>What rolls out the door</h2>
          </div>
          <div className="grid grid--4">
            {capabilities.map((c, i) => {
              const Icon = CAPABILITY_ICONS[i % CAPABILITY_ICONS.length]
              return (
                <div key={c.title} className="card">
                  <span className="card__icon">
                    <Icon />
                  </span>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ For the community */}
      <section className="section section--alt">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">For the community</span>
            <h2>More than the 911 calls</h2>
          </div>
          <div className="grid grid--2">
            <Link className="card card--link home__wide-card" to="/services#cpr">
              <span className="card__icon">
                <IconGraduation />
              </span>
              <h3>Public CPR &amp; first aid classes</h3>
              <p>
                We have over a dozen American Heart Association instructors on the roster.
                Book CPR/AED, general first aid, or BLS for healthcare providers for your
                group — minimum three people.
              </p>
              <span className="card__more">
                Book a class <IconArrow />
              </span>
            </Link>
            <Link className="card card--link home__wide-card" to="/volunteer#student">
              <span className="card__icon">
                <IconUsers />
              </span>
              <h3>Student &amp; youth program</h3>
              <p>
                High schoolers from 14+ ride with veteran providers, earn volunteer credit
                for college applications, and get a free CPR card. The program costs families
                nothing.
              </p>
              <span className="card__more">
                Explore the program <IconArrow />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Gallery */}
      <section className="section section--alt">
        <div className="wrap">
          <div className="section__head">
            <span className="eyebrow">Photos</span>
            <h2>The agency at work</h2>
          </div>
          <Gallery photos={gallery.slice(0, 3)} />
          <p className="home__gallery-more">
            <Link to="/about#gallery">
              See the full gallery <IconArrow />
            </Link>
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
