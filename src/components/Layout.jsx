import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { org } from '../data/site'
import { IconFacebook, IconMenu, IconPhone, IconPin, IconX } from './Icons'
import './layout.css'

const NAV = [
  { to: '/about', label: 'About' },
  { to: '/volunteer', label: 'Volunteer' },
  { to: '/services', label: 'Services' },
  { to: '/support', label: 'Support Us' },
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
          <img src="/images/logo.jpg" alt="" width="52" height="52" className="brand__mark" />
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
          <img src="/images/logo.jpg" alt="" width="64" height="64" />
          <p className="site-footer__mission">
            A non-profit, all-volunteer ambulance agency serving the Shirley ambulance tax
            district since {org.foundedYear}.
          </p>
          <a
            className="site-footer__social"
            href={org.facebook}
            target="_blank"
            rel="noreferrer"
          >
            <IconFacebook /> Follow us on Facebook
          </a>
        </div>

        <div>
          <h4>Visit or write</h4>
          <address>
            <a href={org.mapsUrl} target="_blank" rel="noreferrer">
              <IconPin /> {org.station.street}
              <br />
              <span className="site-footer__indent">
                {org.station.city}, {org.station.state} {org.station.zip}
              </span>
            </a>
            <span className="site-footer__note">Mailing: {org.mailing.full}</span>
            <a href={org.phoneHref}>
              <IconPhone /> {org.phone}
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
          </ul>
        </div>

        <div>
          <h4>Request &amp; support</h4>
          <ul className="site-footer__links">
            <li>
              <Link to="/services#cpr">Book a CPR class</Link>
            </li>
            <li>
              <Link to="/services#standby">Request a stand-by</Link>
            </li>
            <li>
              <Link to="/support">Donate</Link>
            </li>
            <li>
              <Link to="/support#fundraiser">Fundraisers</Link>
            </li>
            <li>
              <a href={org.membersPortalUrl} target="_blank" rel="noreferrer">
                Members only
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="wrap site-footer__legal">
        <p>
          © {new Date().getFullYear()} {org.name}. All rights reserved. {org.name} is a
          registered non-profit organization.
        </p>
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
