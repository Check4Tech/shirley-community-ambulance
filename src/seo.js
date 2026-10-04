import { org } from './data/site'

export const SITE_URL = 'https://shirleycommunityambulance.org'

/**
 * Per-route metadata. Descriptions are written to stand on their own as an
 * answer: search engines and AI assistants frequently lift them verbatim, so
 * each one names the agency, what it does, and where.
 */
export const PAGE_SEO = {
  '/': {
    title: 'Shirley Community Ambulance | Volunteer EMS in Shirley, NY',
    description:
      'Shirley Community Ambulance is a non-profit, volunteer EMS agency serving the Shirley ambulance tax district in Shirley, New York since 1977. We answer over 1,500 emergency calls a year with Advanced and Basic Life Support, 24 hours a day. Call 911 for emergencies or (631) 399-5380 for business.',
    image: '/images/hero-crew.jpg',
  },
  '/about': {
    title: 'About Us & Board of Directors | Shirley Community Ambulance',
    description:
      'Shirley Community Ambulance has served Shirley, New York since 1977 as a non-profit volunteer ambulance agency. Three ambulances, two first-response vehicles, one station, and over 1,500 calls a year. Meet the 2026 board of directors and medical directors.',
    image: '/images/students.jpg',
  },
  '/volunteer': {
    title: 'Become a Volunteer EMT | Shirley Community Ambulance',
    description:
      'Join Shirley Community Ambulance as a volunteer. No medical experience needed — we pay for your EMT training, uniforms, and certifications. Adult members commit 12 hours a week. Students aged 14–18 can join the free youth program and ride with veteran EMS providers.',
    image: '/images/youth-group.jpg',
  },
  '/services': {
    title: 'CPR Classes, Event Stand-By & Records | Shirley Community Ambulance',
    description:
      'Book an American Heart Association CPR/AED, First Aid, or BLS for Healthcare Providers class with Shirley Community Ambulance (minimum three people), request ambulance, bike team, or rehab-unit coverage for an event, or send a records request in Shirley, New York.',
    image: '/images/hero-crew.jpg',
  },
  '/support': {
    title: 'Donate to Shirley Community Ambulance | Support Volunteer EMS',
    description:
      'Every member of Shirley Community Ambulance is a volunteer, so donations buy equipment, training, and supplies rather than salaries. Give online or mail a check to PO Box 72, Shirley NY 11967. The same page lists challenge coins, stickers, and shirts; checkout is on Zeffy and pickup is at the station in Shirley, NY.',
    image: '/images/ambulance.jpg',
  },
  '/fundraiser': {
    title: 'Events | Shirley Community Ambulance',
    description:
      'Upcoming community events with Shirley Community Ambulance in Shirley, New York, including the holiday parade, Christmas party, children’s holiday party, and installation of officers dinner.',
    image: '/images/parade.jpg',
  },
  '/contact': {
    title: 'Contact Us | Shirley Community Ambulance, Shirley NY',
    description:
      'Reach Shirley Community Ambulance at (631) 399-5380 or visit the station at 3 Plymouth Place, Shirley, NY 11967. Officer extensions, email addresses, and a contact form are all here. For emergencies, always call 911.',
    image: '/images/station.jpg',
  },
  '/members': {
    title: 'Members Login | Shirley Community Ambulance',
    description:
      'Sign in to the Shirley Community Ambulance member portal. For help reaching the station, call (631) 399-5380. For emergencies, always call 911.',
    image: '/images/station.jpg',
  },
}

export const DEFAULT_SEO = PAGE_SEO['/']

/** Upsert a <meta> tag, matching on name= or property=. */
function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** Replace the JSON-LD block that carries per-page structured data. */
export function setStructuredData(id, json) {
  let el = document.getElementById(id)
  if (!json) {
    if (el) el.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(json)
}

export function applySeo(pathname) {
  const seo = PAGE_SEO[pathname] || DEFAULT_SEO
  const url = SITE_URL + (pathname === '/' ? '/' : pathname)

  document.title = seo.title
  setMeta('name', 'description', seo.description)
  setLink('canonical', url)

  setMeta('property', 'og:title', seo.title)
  setMeta('property', 'og:description', seo.description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:site_name', org.name)
  setMeta('property', 'og:image', SITE_URL + seo.image)

  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', seo.title)
  setMeta('name', 'twitter:description', seo.description)
  setMeta('name', 'twitter:image', SITE_URL + seo.image)

  // Breadcrumbs help both search results and AI answers describe where a page
  // sits in the site.
  const crumbs = [{ name: 'Home', item: `${SITE_URL}/` }]
  if (pathname !== '/') {
    crumbs.push({ name: seo.title.split('|')[0].trim(), item: url })
  }
  setStructuredData('ld-breadcrumbs', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  })
}
