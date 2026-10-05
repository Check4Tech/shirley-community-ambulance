import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Loader from './components/Loader'
import Home from './pages/Home'
import { applySeo } from './seo'

// The landing page is bundled eagerly because it is the most common entry
// point; the rest are split so each route is a small separate download. The
// gap while a chunk loads is what the flipping-shield loader fills.
const About = lazy(() => import('./pages/About'))
const Volunteer = lazy(() => import('./pages/Volunteer'))
const Services = lazy(() => import('./pages/Services'))
const Support = lazy(() => import('./pages/Support'))
const Fundraiser = lazy(() => import('./pages/Fundraiser'))
const Contact = lazy(() => import('./pages/Contact'))
const Members = lazy(() => import('./pages/Members'))
const MembersLayout = lazy(() => import('./pages/members/MembersLayout'))
const MembersHome = lazy(() => import('./pages/members/MembersHome'))
const MembersCalendar = lazy(() => import('./pages/members/MembersCalendar'))
const MembersRoster = lazy(() => import('./pages/members/MembersRoster'))
const MembersBylaws = lazy(() => import('./pages/members/MembersBylaws'))
const MembersBylawSubmissions = lazy(() => import('./pages/members/MembersBylawSubmissions'))
const MembersSessionForm = lazy(() => import('./pages/members/MembersSessionForm'))
const RequireMember = lazy(() => import('./pages/members/RequireMember'))
const NotFound = lazy(() => import('./pages/NotFound'))

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
  '/fundraisers': '/fundraiser',
  '/contact-us': '/contact',
  '/members-only': '/members',
}

// Route changes should land at the top of the new page, except when the URL
// carries a hash — then honour the anchor.
function RouteEffects() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    applySeo(pathname)
  }, [pathname])

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    // The target section belongs to the page we are navigating to, and that
    // page may still be loading its chunk, so poll briefly for the anchor.
    let frames = 0
    let raf = 0
    const tryScroll = () => {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
      if (frames++ < 60) raf = requestAnimationFrame(tryScroll)
      else window.scrollTo(0, 0)
    }
    raf = requestAnimationFrame(tryScroll)
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash])

  return null
}

export default function App() {
  return (
    <Layout>
      <RouteEffects />
      <Suspense fallback={<Loader label="Loading…" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/services" element={<Services />} />
          <Route path="/support" element={<Support />} />
          {/* The store used to be its own page. Merchandise now lives on Support. */}
          <Route path="/shop" element={<Navigate to="/support#shop" replace />} />
          <Route path="/fundraiser" element={<Fundraiser />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/members" element={<Members />} />
          <Route
            element={
              <RequireMember>
                <MembersLayout />
              </RequireMember>
            }
          >
            <Route path="/members/home" element={<MembersHome />} />
            <Route path="/members/calendar" element={<MembersCalendar />} />
            <Route path="/members/roster" element={<MembersRoster />} />
            <Route path="/members/students" element={<MembersRoster group="students" />} />
            <Route path="/members/probationary" element={<MembersRoster group="probationary" />} />
            <Route path="/members/forms/bylaw" element={<MembersBylaws />} />
            <Route path="/members/forms/bylaw/submissions" element={<MembersBylawSubmissions />} />
            <Route path="/members/forms/bylaw/:id" element={<MembersBylaws />} />
            <Route path="/members/forms/uniform" element={<MembersSessionForm kind="uniform" />} />
            <Route path="/members/forms/reimbursement" element={<MembersSessionForm kind="reimbursement" />} />
            <Route path="/members/forms/bls-preceptor" element={<MembersSessionForm kind="bls" />} />
            <Route path="/members/forms/als-preceptor" element={<MembersSessionForm kind="als" />} />
            <Route path="/members/bylaws" element={<Navigate to="/members/forms/bylaw" replace />} />
          </Route>
          {/* The old GoDaddy URLs redirect to their new home so that existing
              links, bookmarks, and search results keep working. */}
          {Object.entries(LEGACY_URLS).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
