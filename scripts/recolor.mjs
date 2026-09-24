/**
 * One-shot palette migration: red brand accent -> azure.
 *
 * Red is kept only where it signals an emergency (the 911 bar, the 911 callout
 * on the contact page) or a form error. Those spots are switched to the
 * explicitly-named --alert-* scale so they can't be mistaken for branding.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const FILES = [
  'src/styles/global.css',
  'src/components/layout.css',
  'src/components/ui.css',
  'src/pages/about.css',
  'src/pages/contact.css',
  'src/pages/home.css',
  'src/pages/services.css',
  'src/pages/support.css',
  'src/pages/volunteer.css',
]

// Selector blocks whose red is intentional. Everything else becomes azure.
const KEEP_RED_BLOCKS = ['.emergency-bar', '.emergency-callout', '.form-status--err']

const HEX = {
  '#ff8e9f': 'var(--accent-200)',
  '#ff9aa9': 'var(--accent-200)',
  '#ffd2d9': 'var(--accent-200)',
  '#ffe3e7': '#d7e8fb',
}

let totalRed = 0
let totalAlert = 0

for (const file of FILES) {
  const original = readFileSync(file, 'utf8')

  // Split into "chunks" at rule boundaries so we can tell whether a red value
  // belongs to one of the emergency selectors.
  const lines = original.split('\n')
  let currentSelector = ''
  const out = lines.map((line) => {
    const selMatch = line.match(/^([.#:@][^{]*|[a-zA-Z][^{]*)\{\s*$/)
    if (selMatch) currentSelector = selMatch[1].trim()

    const keepRed = KEEP_RED_BLOCKS.some((s) => currentSelector.includes(s))

    let next = line.replace(/var\(--red-(\d+)\)/g, (_, n) => {
      if (keepRed) {
        totalAlert++
        return `var(--alert-${n})`
      }
      totalRed++
      return `var(--accent-${n})`
    })

    for (const [from, to] of Object.entries(HEX)) {
      if (next.toLowerCase().includes(from)) {
        next = next.replace(new RegExp(from, 'gi'), to)
        totalRed++
      }
    }
    return next
  })

  const result = out.join('\n')
  if (result !== original) {
    writeFileSync(file, result)
    console.log(`updated ${file}`)
  }
}

console.log(`\n${totalRed} value(s) moved to azure, ${totalAlert} kept as --alert-* (emergency)`)
