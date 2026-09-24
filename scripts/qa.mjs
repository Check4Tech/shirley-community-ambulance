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

async function settle(page) {
  // Scroll the full height so lazy images enter the viewport and start
  // fetching, then wait for every <img> to actually finish decoding.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.6
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 110))
    }
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 250))
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState('networkidle')
  await page
    .waitForFunction(
      () => [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0),
      undefined,
      { timeout: 8000 }
    )
    .catch(() => {})
  await page.waitForTimeout(250)
}

async function checkPage(page, path, tag) {
  const broken = await page.$$eval('img', (els) =>
    els.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src)
  )
  broken.forEach((s) => problems.push(`[broken image] ${tag} ${path} — ${s}`))

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  )
  if (overflow) problems.push(`[overflow-x] ${tag} ${path} scrolls horizontally`)
}

// ------------------------------------------------------------------ desktop
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[console.${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`))

for (const [name, path] of pages) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await settle(page)
  await checkPage(page, path, '1440')
  await page.screenshot({ path: `${OUT}/${name}-desktop.png`, fullPage: true })
  console.log(`shot ${name}-desktop.png`)
}

// ------------------------------------------- board of directors, all widths
for (const w of [1440, 1100, 1000, 900, 768, 390]) {
  await page.setViewportSize({ width: w, height: 900 })
  await page.goto(`${BASE}/about`, { waitUntil: 'networkidle' })
  await settle(page)
  await checkPage(page, '/about', `${w}`)

  const board = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.board__node')].map((n) => {
      const r = n.getBoundingClientRect()
      return { name: n.querySelector('.person__name')?.textContent?.trim(), r }
    })
    const shield = document.querySelector('.board__shield')?.getBoundingClientRect() ?? null
    // pairwise overlap
    const overlaps = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].r
        const b = nodes[j].r
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
          overlaps.push(`${nodes[i].name} <-> ${nodes[j].name}`)
      }
    }
    const shieldHits = shield
      ? nodes
          .filter(
            (n) =>
              n.r.left < shield.right &&
              shield.left < n.r.right &&
              n.r.top < shield.bottom &&
              shield.top < n.r.bottom
          )
          .map((n) => n.name)
      : []
    // clipped text?
    const clipped = [...document.querySelectorAll('.board__node .person')]
      .filter((el) => el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)
      .map((el) => el.querySelector('.person__name')?.textContent?.trim())
    return { count: nodes.length, overlaps, shieldHits, clipped }
  })

  if (board.overlaps.length) problems.push(`[board ${w}px] cards overlap: ${board.overlaps.join(', ')}`)
  if (board.shieldHits.length) problems.push(`[board ${w}px] card overlaps shield: ${board.shieldHits.join(', ')}`)
  if (board.clipped.length) problems.push(`[board ${w}px] clipped text in: ${board.clipped.join(', ')}`)
  console.log(
    `board @${w}px: ${board.count} cards, ${board.overlaps.length} overlaps, ${board.clipped.length} clipped`
  )

  await page.locator('#leadership').scrollIntoViewIfNeeded()
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${OUT}/board-${w}.png` })
}

// ------------------------------------------------------------ hover states
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto(BASE, { waitUntil: 'networkidle' })
await settle(page)

const decorationOf = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return 'MISSING'
    const cs = getComputedStyle(el)
    return `${cs.textDecorationLine} | color ${cs.color} | bg ${cs.backgroundColor}`
  }, sel)

const headerTargets = [
  ['.nav-desktop a', 'desktop nav link'],
  ['.brand', 'brand link'],
  ['.members-login', 'Members Login'],
  ['.site-header .btn--primary', 'header Donate'],
  ['.emergency-bar__phone', 'emergency bar phone'],
]
console.log('\n--- header hover states (expect no underline) ---')
for (const [sel, label] of headerTargets) {
  const el = page.locator(sel).first()
  if ((await el.count()) === 0) {
    problems.push(`[hover] ${label} not found (${sel})`)
    continue
  }
  const before = await decorationOf(sel)
  await el.hover()
  await page.waitForTimeout(220)
  const after = await decorationOf(sel)
  console.log(`${label.padEnd(22)} rest: ${before}\n${''.padEnd(22)} hover: ${after}`)
  if (after.startsWith('underline')) problems.push(`[hover] ${label} still underlines on hover`)
  if (before === after) problems.push(`[hover] ${label} has no visible hover change`)
}
await page.screenshot({ path: `${OUT}/hover-header.png`, clip: { x: 0, y: 0, width: 1440, height: 130 } })

// Card hover must not recolour the heading/paragraph.
console.log('\n--- action card hover (only .card__more may change) ---')
const cardBefore = await page.evaluate(() => {
  const c = document.querySelector('.action-card')
  return {
    h3: getComputedStyle(c.querySelector('h3')).color,
    p: getComputedStyle(c.querySelector('p')).color,
    more: getComputedStyle(c.querySelector('.card__more')).color,
  }
})
await page.locator('.action-card').first().hover()
await page.waitForTimeout(250)
const cardAfter = await page.evaluate(() => {
  const c = document.querySelector('.action-card')
  return {
    h3: getComputedStyle(c.querySelector('h3')).color,
    p: getComputedStyle(c.querySelector('p')).color,
    more: getComputedStyle(c.querySelector('.card__more')).color,
    moreDec: getComputedStyle(c.querySelector('.card__more')).textDecorationLine,
  }
})
console.log('h3  ', cardBefore.h3, '->', cardAfter.h3)
console.log('p   ', cardBefore.p, '->', cardAfter.p)
console.log('more', cardBefore.more, '->', cardAfter.more, `(${cardAfter.moreDec})`)
if (cardBefore.h3 !== cardAfter.h3) problems.push('[card hover] heading colour changed on hover')
if (cardBefore.p !== cardAfter.p) problems.push('[card hover] paragraph colour changed on hover')
if (cardBefore.more === cardAfter.more && cardAfter.moreDec === 'none')
  problems.push('[card hover] call-to-action does not react to hover')
await page.locator('.action-card').first().screenshot({ path: `${OUT}/hover-card.png` })

// Button hover on a light section and on a dark section.
for (const [sel, label, file] of [
  ['.action-card', 'skip', null],
  ['.hero__actions .btn--primary', 'hero Donate/Apply (dark)', 'hover-btn-dark.png'],
]) {
  if (!file) continue
  const el = page.locator(sel).first()
  if ((await el.count()) === 0) continue
  await el.hover()
  await page.waitForTimeout(220)
  await el.screenshot({ path: `${OUT}/${file}` })
}
await page.goto(`${BASE}/support`, { waitUntil: 'networkidle' })
await settle(page)
const lightBtn = page.locator('.btn--lg').first()
if (await lightBtn.count()) {
  await lightBtn.hover()
  await page.waitForTimeout(220)
  await lightBtn.screenshot({ path: `${OUT}/hover-btn-light.png` })
}

// ------------------------------------------------------ route loader + mobile
// Fresh context: once /about has been visited its module is already in the
// browser's registry, React.lazy resolves immediately and Suspense never shows
// a fallback. Dev serves the chunk as /src/pages/About.jsx, a production build
// as /assets/About-<hash>.js, so match either.
{
  const lctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const lpage = await lctx.newPage()
  await lctx.route('**/*About*', async (route) => {
    const url = route.request().url()
    if (/About(-[\w-]+)?\.(jsx|js)/.test(url)) {
      await new Promise((r) => setTimeout(r, 1800))
    }
    await route.continue().catch(() => {})
  })

  await lpage.goto(BASE, { waitUntil: 'networkidle' })
  await lpage.locator('.nav-desktop a[href="/about"]').click()
  await lpage.waitForTimeout(500)

  const loaderVisible = await lpage.locator('.loader').isVisible().catch(() => false)
  const anim = loaderVisible
    ? await lpage.evaluate(() => {
        const card = document.querySelector('.loader__card')
        if (!card) return 'no-card'
        const cs = getComputedStyle(card)
        return `${cs.animationName} / ${cs.transformStyle}`
      })
    : 'n/a'
  console.log(`\nroute loader visible during lazy load: ${loaderVisible} (${anim})`)
  if (loaderVisible) await lpage.screenshot({ path: `${OUT}/loader.png` })
  else problems.push('[loader] flip loader did not appear during a lazy route load')
  if (loaderVisible && !anim.startsWith('shield-flip'))
    problems.push(`[loader] expected shield-flip animation, got ${anim}`)
  await lctx.close()
}

const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const mp = await mctx.newPage()
mp.on('pageerror', (e) => problems.push(`[mobile pageerror] ${e.message}`))
await mp.goto(BASE, { waitUntil: 'networkidle' })
await settle(mp)
await checkPage(mp, '/', '390')
await mp.screenshot({ path: `${OUT}/home-mobile.png`, fullPage: true })
await mp.locator('.nav-toggle').click()
await mp.waitForTimeout(320)
await mp.screenshot({ path: `${OUT}/home-mobile-nav.png` })
const mobileDonate = await mp.evaluate(() => {
  const b = document.querySelector('.nav-mobile__foot .btn--primary')
  if (!b) return null
  const cs = getComputedStyle(b)
  return { color: cs.color, bg: cs.backgroundColor, dec: cs.textDecorationLine }
})
console.log('mobile Donate rest:', JSON.stringify(mobileDonate))
if (mobileDonate && mobileDonate.color !== 'rgb(255, 255, 255)')
  problems.push(`[mobile] Donate label is ${mobileDonate.color}, expected white`)

await browser.close()

console.log('\n================ PROBLEMS ================')
if (problems.length === 0) console.log('none found')
else [...new Set(problems)].forEach((p) => console.log(p))
