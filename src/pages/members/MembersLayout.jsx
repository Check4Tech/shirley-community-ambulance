import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logoutMember, readSession } from '../../auth/session'
import './members-area.css'

const RIG_CHECKS_URL = 'https://check4tech.net/shirley/user-portal'

const TABS = [
  { to: '/members/home', label: 'Home', end: true },
  { to: '/members/calendar', label: 'Calendar' },
  { to: '/members/roster', label: 'Members' },
  { to: '/members/students', label: 'Students' },
  { to: '/members/probationary', label: 'Probationary' },
]

const FORM_LINKS = [
  { to: '/members/forms/bylaw', label: 'Bylaw proposal' },
  { to: '/members/forms/uniform', label: 'Uniform request' },
  { to: '/members/forms/reimbursement', label: 'Reimbursement' },
  { to: '/members/forms/bls-preceptor', label: 'BLS preceptor form' },
  { to: '/members/forms/als-preceptor', label: 'ALS preceptor form' },
]

function menuLinks(root) {
  if (!root) return []
  return [...root.querySelectorAll('.members-nav__menu a')]
}

function placeMenu(menu) {
  if (!menu) return
  menu.style.left = ''
  menu.style.right = ''
  menu.style.maxWidth = ''
  if (getComputedStyle(menu).position !== 'absolute') return

  const pad = 8
  const rect = menu.getBoundingClientRect()
  if (rect.right > window.innerWidth - pad) {
    menu.style.left = 'auto'
    menu.style.right = '0px'
  }
  const flipped = menu.getBoundingClientRect()
  if (flipped.left < pad || flipped.right > window.innerWidth - pad) {
    menu.style.left = '0px'
    menu.style.right = 'auto'
    menu.style.maxWidth = `${Math.max(0, window.innerWidth - pad * 2)}px`
  }
}

function FormsMenu() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const pendingFocus = useRef(null)
  const menuId = useId()
  const current = FORM_LINKS.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  )

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useLayoutEffect(() => {
    if (!open) return undefined
    placeMenu(menuRef.current)
    const onResize = () => placeMenu(menuRef.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const target = pendingFocus.current
    pendingFocus.current = null
    if (target) {
      const links = menuLinks(rootRef.current)
      const item = target === 'last' ? links[links.length - 1] : links[0]
      item?.focus()
    }

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function openMenu(focus) {
    if (open) {
      const links = menuLinks(rootRef.current)
      const item = focus === 'last' ? links[links.length - 1] : links[0]
      item?.focus()
      return
    }
    pendingFocus.current = focus
    setOpen(true)
  }

  function onButtonKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openMenu('first')
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu('last')
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  function onMenuKeyDown(event) {
    const links = menuLinks(rootRef.current)
    const index = links.indexOf(document.activeElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      links[(index + 1) % links.length]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      links[(index - 1 + links.length) % links.length]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      links[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      links[links.length - 1]?.focus()
    } else if (event.key === 'Tab') {
      const leaving = (!event.shiftKey && index === links.length - 1) || (event.shiftKey && index <= 0)
      if (leaving) setOpen(false)
    }
  }

  return (
    <li ref={rootRef} className={`members-nav__forms${open ? ' is-open' : ''}`}>
      <button
        type="button"
        ref={buttonRef}
        className={`members-nav__forms-btn${current ? ' is-current' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
      >
        Forms
        <span className="members-nav__caret" aria-hidden="true" />
      </button>
      <ul
        id={menuId}
        ref={menuRef}
        className="members-nav__menu"
        hidden={!open}
        onKeyDown={onMenuKeyDown}
      >
        {FORM_LINKS.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} onClick={() => setOpen(false)}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </li>
  )
}

export default function MembersLayout() {
  const navigate = useNavigate()
  const session = readSession()

  async function signOut() {
    await logoutMember(session)
    navigate('/', { replace: true })
  }

  return (
    <div className="members-area">
      <div className="members-nav">
        <div className="wrap members-nav__inner">
          <p className="members-nav__who">
            Signed in as <strong>{session?.username}</strong>
          </p>
          <nav aria-label="Members">
            <ul>
              {TABS.map((tab) => (
                <li key={tab.to}>
                  <NavLink to={tab.to} end={tab.end}>
                    {tab.label}
                  </NavLink>
                </li>
              ))}
              <FormsMenu />
              <li>
                <a href={RIG_CHECKS_URL}>Rig Checks</a>
              </li>
            </ul>
          </nav>
          <button type="button" className="members-nav__signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
