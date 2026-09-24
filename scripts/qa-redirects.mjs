import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const expected = {
  '/about-us': '/about',
  '/directors': '/about#leadership',
  '/photos': '/about#gallery',
  '/adult-membership': '/volunteer#adult',
  '/student%2Fyouth-program': '/volunteer#student',
  '/public-training-courses': '/services#cpr',
  '/stand-by-requests': '/services#standby',
  '/fundraisers': '/support#fundraiser',
  '/contact-us': '/contact',
  '/definitely-not-a-page': '/definitely-not-a-page', // should render the 404 page
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
let failures = 0

for (const [from, want] of Object.entries(expected)) {
  await page.goto(BASE + from, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const got = await page.evaluate(() => location.pathname + location.hash)
  const h1 = (await page.locator('h1').first().textContent())?.trim()
  const ok = got === want
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${from}  ->  ${got}${ok ? '' : `  (wanted ${want})`}   h1="${h1}"`)
}

await browser.close()
console.log(failures === 0 ? '\nall redirects OK' : `\n${failures} redirect(s) failed`)
