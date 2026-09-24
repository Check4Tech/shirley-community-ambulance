# Shirley Community Ambulance

A rebuild of [shirleycommunityambulance.org](https://shirleycommunityambulance.org/) as a
React single-page app, replacing the original GoDaddy Website Builder site.

Shirley Community Ambulance is a non-profit, volunteer EMS agency serving the Shirley
ambulance tax district in Shirley, New York.

Website designed and hosted by [Check4Tech Solutions](https://check4tech.net/), a Check4Tech Corp company.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

## What changed from the original site

### Navigation: 13 entries down to 5

The old nav had `Home · About Us · Directors · Contact us · Photos · Become a Member
(Adult Membership, Student/Youth Program) · Events (Public training courses, Fundraisers,
Stand-By Requests) · Members Only` — roughly a dozen destinations for a site whose home page
contained one image and a donate button.

Pages were merged by **what the visitor is trying to do**, not by how the agency is organised
internally:

| New page | Replaces |
| --- | --- |
| `/about` | About Us, Directors, Photos |
| `/volunteer` | Adult Membership, Student/Youth Program |
| `/services` | Public training courses, Stand-By Requests |
| `/support` | Donate, Fundraisers |
| `/contact` | Contact us |

"Members Only" was a login wall with no public content, so it moved to a footer link.

Every old URL redirects to its new home (see `LEGACY_URLS` in `src/App.jsx`), so existing
links, bookmarks, and search results keep working. `npm run qa:redirects` verifies them.

### Home page

The original home page was a donate banner, a hero image, and a heading that rendered six
times in a row. It said nothing about who the agency is or what it does.

The new home page leads with the agency's identity and the three things people actually come
for — volunteering, donating, and requesting event coverage — then covers capabilities,
community programs, the current fundraiser, and photos.

### Other fixes

- **`Signed in as: filler@godaddy.com` leaked into the page source on every page** of the
  original site. Gone.
- **No "call 911" notice anywhere** on an emergency services website. There is now a
  persistent bar at the top of every page and a callout on the contact page.
- The copyright footer read 2026 while the site was live in 2025; the year is now computed.
- Body copy had a number of typos ("perusing a career", "apart of the program", "Whats the
  benefit"). Corrected in `src/data/site.js`.
- Added real page titles, meta descriptions, Open Graph tags, `EmergencyService` JSON-LD
  structured data, a sitemap, and `robots.txt`.
- Keyboard-accessible accordion and photo lightbox, skip-to-content link, visible focus
  rings, labelled form fields, and alt text on every photo.

### A note on "since 1977"

The About Us copy says 1977, but the banner in one of the agency's own photos reads
"Serving since 1978". The site uses 1977 throughout (from `org.foundedYear` in
`src/data/site.js`) — worth confirming with the agency and changing in one place if needed.

## Editing content

Almost all text, names, phone extensions, and lists live in **`src/data/site.js`**. Changing
a director, adding a benefit, or switching off the fundraiser banner (`fundraiser.active`)
does not require touching a component.

## Project layout

```
public/images/     Photos pulled from the original site
src/data/site.js   All site content
src/components/    Layout (header/footer/nav), shared UI, icons
src/pages/         One component + one stylesheet per page
src/styles/        Design tokens, reset, shared primitives
scripts/           Image downloader and Playwright QA scripts
```

Styling is plain CSS with custom properties — no Tailwind or CSS-in-JS — so the agency can
hand this to any web developer without them needing to learn a toolchain.

## Forms

The original site used GoDaddy's built-in form handling, which does not exist here. Each form
posts to whatever endpoint is set in `VITE_FORM_ENDPOINT` (Formspree, Netlify Forms, Basin,
etc.):

```bash
# .env.local
VITE_FORM_ENDPOINT=https://formspree.io/f/your-form-id
```

**Without that variable set, forms fall back to opening a pre-filled email draft** so they are
never a dead end — but configure a real endpoint before going live.

## QA

`npm run qa` drives a headless Chromium through every page and reports console errors, broken
images, horizontal overflow, and whether the lightbox and accordion work. It writes
full-page desktop and mobile screenshots to `qa-shots/`. The dev server must be running.

## Deploying

The build output in `dist/` is static. Because this is a single-page app, the host must serve
`index.html` for unknown paths — `public/_redirects` (Netlify) and `vercel.json` (Vercel) are
included. For Apache or nginx, add the equivalent rewrite rule.

## Image credits

Photos in `public/images/` were taken from the existing website, where they appear to be the
agency's own. One exception: `ambulance.jpg` carries a **"© 2023 Suffolk Fire Photos"**
watermark and is credited in the gallery — confirm the agency has permission to use it, or
swap it out.

The raffle prize photos (`greek-isles*.jpg`, `riviera-maya*.jpg`) are supplied stock imagery
from the raffle provider and should be removed when that fundraiser ends.
