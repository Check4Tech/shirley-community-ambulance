import { chromium } from 'playwright'

const base = 'http://localhost:5173'

async function install(page) {
  await page.addInitScript((value) => {
    sessionStorage.setItem('sca-member-session', JSON.stringify(value))
  }, {
    accessToken: 'verify-access',
    refreshToken: 'verify-refresh',
    username: 'ARIVERA',
    userId: 7,
    organizationId: 1,
    roles: ['ROLE_EMS_ORG_ADMIN'],
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/users/organization') || path.endsWith('/users/active')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 11, firstName: 'Jordan', lastName: 'Hale', certification: 'STUDENT', isActive: true }]),
      })
      return
    }
    if (path.endsWith('/organization')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ isForProfit: false }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

async function expectCentered(page, path, buttonName) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: buttonName }).click()
  const dialog = page.getByRole('dialog', { name: 'Add User' })
  await dialog.waitFor()
  const box = await dialog.getByRole('button', { name: 'Submit' }).evaluate((button) => {
    const buttonBox = button.getBoundingClientRect()
    const panel = button.closest('.user-add-modal').getBoundingClientRect()
    const buttonCenter = buttonBox.left + buttonBox.width / 2
    const panelCenter = panel.left + panel.width / 2
    return { delta: Math.abs(buttonCenter - panelCenter), justify: getComputedStyle(button.parentElement).justifyContent }
  })
  if (box.justify !== 'center' || box.delta > 2) {
    throw new Error(`${buttonName} is not centered (${JSON.stringify(box)})`)
  }
  await dialog.getByRole('button', { name: 'Close' }).click()
  await dialog.waitFor({ state: 'hidden' })
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await install(page)
await expectCentered(page, '/members/students', 'Add student')
await expectCentered(page, '/members/probationary', 'Add probationary')
console.log('verified centered submit')
await browser.close()
