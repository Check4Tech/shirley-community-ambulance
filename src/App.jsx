import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import About from './pages/About'
import Volunteer from './pages/Volunteer'
import Services from './pages/Services'
import Support from './pages/Support'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'

const TITLES = {
  '/': 'Shirley Community Ambulance | Volunteer EMS in Shirley, NY',
  '/about': 'About Us | Shirley Community Ambulance',
  '/volunteer': 'Become a Member | Shirley Community Ambulance',
  '/services': 'CPR Classes & Stand-By Requests | Shirley Community Ambulance',
  '/support': 'Donate & Fundraisers | Shirley Community Ambulance',
  '/contact': 'Contact Us | Shirley Community Ambulance',
}

// Old GoDaddy paths -> their new location. The student program page used to
// live at a path containing an encoded slash, so both spellings are covered.
const LEGACY_URLS = {
  '/about-us': '/about',
  '/directors': '/about#leadership',
  '/photos': '/about#gallery',
  '/adult-membership': '/volunteer#adult',
  '/student/youth-program': '/volunteer#student',
  '/student%2Fyouth-program': '/volunteer#student',
  '/public-training-courses': '/services#cpr',
  '/stand-by-requests': '/services#standby',
  '/fundraisers': '/support#fundraiser',
  '/contact-us': '/contact',
}

// Route changes should land at the top of the new page, except when the URL
// carries a hash — then honour the anchor.
function RouteEffects() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    document.title = TITLES[pathname] || 'Shirley Community Ambulance'
  }, [pathname])

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    // The target section belongs to the page we are navigating to, so wait a
    // frame for it to mount before scrolling.
    const id = requestAnimationFrame(() => {
      const el = document.querySelector(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
      else window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(id)
  }, [pathname, hash])

  return null
}

export default function App() {
  return (
    <Layout>
      <RouteEffects />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/volunteer" element={<Volunteer />} />
        <Route path="/services" element={<Services />} />
        <Route path="/support" element={<Support />} />
        <Route path="/contact" element={<Contact />} />
        {/* The old GoDaddy URLs redirect to their new home so that existing
            links, bookmarks, and search results keep working. */}
        {Object.entries(LEGACY_URLS).map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
