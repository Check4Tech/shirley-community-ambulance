import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5173'
const OUT = 'qa-shots'
mkdirSync(OUT, { recursive: true })

const pages = [
  ['home', '/'],
  ['about', '/about'],
  ['volunteer', '/volunteer'],
  ['services', '/services'],
  ['support', '/support'],
  ['contact', '/contact'],
]

const problems = []
const browser = await chromium.launch()

// ---------------------------------------------------------------- desktop
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') {
    problems.push(`[console.${m.type()}] ${m.text()}`)
  }
})
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) =>
  problems.push(`[requestfailed] ${r.url()} — ${r.failure()?.errorText}`)
)

for (const [name, path] of pages) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  // Scroll the whole page so lazy-loaded images actually fetch, then come back.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)

  // any image that failed to decode?
  const brokenImgs = await page.$$eval('img', (els) =>
    els.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src)
  )
  brokenImgs.forEach((src) => problems.push(`[broken image] ${path} — ${src}`))

  // anything wider than the viewport (horizontal overflow)?
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth
    return [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && (r.right > docW + 2 || r.left < -2)
      })
      .slice(0, 6)
      .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`)
  })
  overflow.forEach((sel) => problems.push(`[overflow-x] ${path} — ${sel}`))

  await page.screenshot({ path: `${OUT}/${name}-desktop.png`, fullPage: true })
  console.log(`shot ${name}-desktop.png`)
}

// ------------------------------------------------------------ interactions
// Gallery lightbox on /about
await page.goto(`${BASE}/about`, { waitUntil: 'networkidle' })
await page.locator('.gallery__tile').first().click()
await page.waitForTimeout(350)
const lightboxOpen = await page.locator('.lightbox').isVisible()
await page.screenshot({ path: `${OUT}/about-lightbox.png` })
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
const lightboxClosed = (await page.locator('.lightbox').count()) === 0
console.log(`lightbox opens: ${lightboxOpen}, closes on Escape: ${lightboxClosed}`)
if (!lightboxOpen) problems.push('[interaction] lightbox did not open')
if (!lightboxClosed) problems.push('[interaction] lightbox did not close on Escape')

// FAQ accordion on /volunteer
await page.goto(`${BASE}/volunteer`, { waitUntil: 'networkidle' })
const trigger = page.locator('.accordion__trigger').nth(2)
await trigger.scrollIntoViewIfNeeded()
await trigger.click()
await page.waitForTimeout(300)
const expanded = await trigger.getAttribute('aria-expanded')
await page.screenshot({ path: `${OUT}/volunteer-accordion.png` })
console.log(`accordion expands: ${expanded === 'true'}`)
if (expanded !== 'true') problems.push('[interaction] accordion did not expand')

// ----------------------------------------------------------------- mobile
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const mp = await mctx.newPage()
mp.on('pageerror', (e) => problems.push(`[mobile pageerror] ${e.message}`))

await mp.goto(BASE, { waitUntil: 'networkidle' })
await mp.waitForTimeout(400)
await mp.screenshot({ path: `${OUT}/home-mobile.png`, fullPage: true })

const hOverflow = await mp.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
)
if (hOverflow) problems.push('[overflow-x] mobile home page scrolls horizontally')

await mp.locator('.nav-toggle').click()
await mp.waitForTimeout(350)
await mp.screenshot({ path: `${OUT}/home-mobile-nav.png` })
console.log('shot mobile screenshots')

await browser.close()

console.log('\n================ PROBLEMS ================')
if (problems.length === 0) console.log('none found')
else [...new Set(problems)].forEach((p) => console.log(p))
