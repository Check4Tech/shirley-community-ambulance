import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { fundraiser, org } from '../data/site'
import { IconFacebook, IconInstagram, IconMenu, IconPhone, IconPin, IconX } from './Icons'
import './layout.css'

const NAV = [
  { to: '/about', label: 'About' },
  { to: '/volunteer', label: 'Volunteer' },
  { to: '/services', label: 'Services' },
  { to: '/support', label: 'Support' },
  ...(fundraiser.active ? [{ to: '/fundraiser', label: 'Events' }] : []),
  { to: '/contact', label: 'Contact' },
]

function EmergencyBar() {
  return (
    <div className="emergency-bar">
      <div className="wrap emergency-bar__inner">
        <p className="emergency-bar__text">
          <strong>In an emergency, call 911.</strong> This website is not monitored for
          emergencies.
        </p>
        <a className="emergency-bar__phone" href={org.phoneHref}>
          <IconPhone /> Business line: {org.phone}
        </a>
      </div>
    </div>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const panelRef = useRef(null)

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname])

  // Escape closes the menu; lock body scroll while it is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link to="/" className="brand" aria-label={`${org.name} — home`}>
          <img
            src="/images/shield.png"
            alt=""
            width="52"
            height="52"
            className="brand__mark"
          />
          <span className="brand__text">
            <span className="brand__name">Shirley Community Ambulance</span>
            <span className="brand__sub">Volunteer EMS · Shirley, NY</span>
          </span>
        </Link>

        <nav className="nav-desktop" aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__actions">
          <NavLink
            className={({ isActive }) => `members-login${isActive ? ' active' : ''}`}
            to={org.membersPath}
          >
            Members Login
          </NavLink>
          <a
            className="btn btn--primary btn--sm"
            href={org.donateUrl}
            target="_blank"
            rel="noreferrer"
          >
            Donate
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconX /> : <IconMenu />}
            <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        ref={panelRef}
        className={`nav-mobile${open ? ' is-open' : ''}`}
        hidden={!open}
      >
        <nav aria-label="Main (mobile)">
          <ul>
            <li>
              <NavLink to="/" end>
                Home
              </NavLink>
            </li>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-mobile__foot">
          <a className="btn btn--primary btn--block" href={org.donateUrl} target="_blank" rel="noreferrer">
            Donate
          </a>
          <a className="btn btn--outline btn--block" href={org.phoneHref}>
            Call {org.phone}
          </a>
          <NavLink className="btn btn--outline btn--block" to={org.membersPath}>
            Members Login
          </NavLink>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__grid">
        <div className="site-footer__brand">
          <img src="/images/shield.png" alt="" width="72" height="72" />
          <p className="site-footer__mission">
            A non-profit, volunteer ambulance agency serving the Shirley ambulance tax
            district since {org.foundedYear}.
          </p>
          <p className="site-footer__follow">Follow us</p>
          <div className="site-footer__socials">
            <a
              className="site-footer__social"
              href={org.facebook}
              target="_blank"
              rel="noreferrer"
            >
              <IconFacebook /> Facebook
            </a>
            <a
              className="site-footer__social"
              href={org.instagram}
              target="_blank"
              rel="noreferrer"
            >
              <IconInstagram /> Instagram
            </a>
          </div>
        </div>

        <div>
          <h4>Visit or write</h4>
          <address>
            <a href={org.mapsUrl} target="_blank" rel="noreferrer">
              <IconPin />
              {/* One block-level flex item holds both lines, so the street and
                  the city/state/zip stack instead of becoming sibling
                  columns of the row. */}
              <span className="site-footer__lines">
                <span>{org.station.street}</span>
                <span>
                  {org.station.city}, {org.station.state} {org.station.zip}
                </span>
              </span>
            </a>
            <span className="site-footer__note">Mailing: {org.mailing.full}</span>
            <a href={org.phoneHref}>
              <IconPhone />
              <span className="site-footer__lines">
                <span>{org.phone}</span>
              </span>
            </a>
          </address>
        </div>

        <div>
          <h4>Explore</h4>
          <ul className="site-footer__links">
            <li>
              <Link to="/about">About us</Link>
            </li>
            <li>
              <Link to="/about#leadership">Board of directors</Link>
            </li>
            <li>
              <Link to="/volunteer">Become a member</Link>
            </li>
            <li>
              <Link to="/volunteer#student">Student &amp; youth program</Link>
            </li>
            <li>
              <Link to="/about#gallery">Photo gallery</Link>
            </li>
            {fundraiser.active && (
              <li>
                <Link to="/fundraiser">Events</Link>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4>Request &amp; support</h4>
          <ul className="site-footer__links">
            {/* Land on the form itself, not the section heading above it. */}
            <li>
              <Link to="/services#cpr-form">Book a CPR class</Link>
            </li>
            <li>
              <Link to="/services#standby-form">Request a stand-by</Link>
            </li>
            <li>
              <Link to="/services#records">Records request</Link>
            </li>
            <li>
              <Link to="/support">Donate</Link>
            </li>
            {fundraiser.active && (
              <li>
                <Link to="/fundraiser">Events</Link>
              </li>
            )}
            <li>
              <Link to={org.membersPath}>Members only</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="wrap site-footer__legal">
        <div className="site-footer__legal-copy">
          <p>
            © {new Date().getFullYear()} {org.name}. All rights reserved. {org.name} is a
            registered non-profit organization.
          </p>
          <p className="site-footer__credit">
            Website designed and hosted by{' '}
            <a href="https://check4tech.net/" target="_blank" rel="noreferrer">
              Check4Tech Solutions
            </a>, a Check4Tech Corp company.
          </p>
        </div>
        <p className="site-footer__emergency">Emergency? Call 911.</p>
      </div>
    </footer>
  )
}

export default function Layout({ children }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <EmergencyBar />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  )
}
