/**
 * Cuts the Shirley Community Ambulance shield out of its white background.
 *
 * Two things make this harder than a plain "make white transparent" pass:
 *
 *  1. The shield's face is white, so only background *connected to the edge of
 *     the image* may be removed. That means a flood fill inward from the
 *     border rather than a global colour key.
 *  2. The blue outline is thin and JPEG-compressed, so it has pinholes. A raw
 *     flood fill leaks through them and eats the shield's white face. To stop
 *     that, the artwork mask is dilated by GAP px before filling (closing the
 *     pinholes), and the resulting background is then grown back by the same
 *     amount so the true edge is restored.
 *
 * Usage: node scripts/isolate-shield.mjs
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SRC = 'scripts/logo-src/shield-orig.jpg'
const OUT_DIR = 'public/images'
const DEBUG_DIR = 'scripts/logo-src'
mkdirSync(OUT_DIR, { recursive: true })

const BRIGHT = 228 // a background pixel is at least this bright in every channel
const NEUTRAL = 26 // ...and this close to neutral grey
const GAP = 2 // max pinhole width to bridge in the outline, in px

// Deliberately no white padding here. The crop clips the shield, so padding the
// canvas with white would reconnect the shield's clipped interior to the
// backdrop and the fill would eat the shield's face.
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const w0 = info.width
const h0 = info.height

const w = w0
const h = h0
const N = w * h
if (info.channels !== 4) throw new Error(`expected RGBA, got ${info.channels} channels`)

// ---- 1. classify every pixel ----------------------------------------------
const isBg = new Uint8Array(N)
for (let i = 0; i < N; i++) {
  const r = data[i * 4]
  const g = data[i * 4 + 1]
  const b = data[i * 4 + 2]
  const min = Math.min(r, g, b)
  const max = Math.max(r, g, b)
  isBg[i] = min >= BRIGHT && max - min <= NEUTRAL ? 1 : 0
}

// ---- 2. dilate the artwork to close pinholes in the outline ----------------
// Chebyshev dilation done as two separable passes for speed.
function dilate(mask, radius) {
  const tmp = new Uint8Array(N)
  const out = new Uint8Array(N)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0
      for (let d = -radius; d <= radius && !v; d++) {
        const nx = x + d
        if (nx >= 0 && nx < w && mask[y * w + nx]) v = 1
      }
      tmp[y * w + x] = v
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0
      for (let d = -radius; d <= radius && !v; d++) {
        const ny = y + d
        if (ny >= 0 && ny < h && tmp[ny * w + x]) v = 1
      }
      out[y * w + x] = v
    }
  }
  return out
}

const art = new Uint8Array(N)
for (let i = 0; i < N; i++) art[i] = isBg[i] ? 0 : 1
const artFat = dilate(art, GAP)

// ---- 3. flood fill the background inward from the four corners -------------
// Seeding from the whole border would be wrong: this crop clips the shield, so
// its bottom point and side edges run off the canvas and its white *interior*
// touches the border. Those interior runs are separated from the corners by the
// blue outline, so corner seeds reach the real backdrop and nothing else.
function floodFromCorners(blocked) {
  const seen = new Uint8Array(N)
  const stack = [0, w - 1, (h - 1) * w, (h - 1) * w + (w - 1)]
  while (stack.length) {
    const i = stack.pop()
    if (seen[i] || blocked[i]) continue
    seen[i] = 1
    const x = i % w
    const y = (i / w) | 0
    if (x > 0) stack.push(i - 1)
    if (x < w - 1) stack.push(i + 1)
    if (y > 0) stack.push(i - w)
    if (y < h - 1) stack.push(i + w)
  }
  return seen
}

// Conservative background (shrunk by GAP because the artwork was fattened)…
const bgShrunk = floodFromCorners(artFat)
// …grown back by the same radius, but never past a genuinely non-white pixel.
const bgGrown = dilate(bgShrunk, GAP)
const outside = new Uint8Array(N)
for (let i = 0; i < N; i++) outside[i] = bgGrown[i] && isBg[i] ? 1 : 0

const pct = (n) => ((n / N) * 100).toFixed(1)
console.log(`white pixels:        ${pct(isBg.reduce((a, v) => a + v, 0))}%`)
console.log(`removed as backdrop: ${pct(outside.reduce((a, v) => a + v, 0))}%`)

// ---- 4. feather the mask by one pixel and write it into the alpha channel ---
const hard = new Uint8Array(N)
for (let i = 0; i < N; i++) hard[i] = outside[i] ? 0 : 255

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (hard[i] === 0) {
      data[i * 4 + 3] = 0
      continue
    }
    let sum = 0
    let n = 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        sum += hard[ny * w + nx]
        n++
      }
    }
    const avg = sum / n
    data[i * 4 + 3] = avg >= 250 ? 255 : Math.round(avg)
  }
}

// Build the RGBA image directly from the mutated buffer — joinChannel silently
// drops the mask when the primary input is already raw RGBA.
const cutBuf = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .png()
  .toBuffer()

// ---- 5. trim, square off, export -------------------------------------------
const trimmed = await sharp(cutBuf).trim({ threshold: 1 }).toBuffer()
const tm = await sharp(trimmed).metadata()
const box = Math.round(Math.max(tm.width, tm.height) * 1.03)
const padTop = Math.round((box - tm.height) / 2)
const padLeft = Math.round((box - tm.width) / 2)

const square = await sharp(trimmed)
  .extend({
    top: padTop,
    bottom: box - tm.height - padTop,
    left: padLeft,
    right: box - tm.width - padLeft,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer()

for (const [name, size] of [
  ['shield.png', 512],
  ['shield-256.png', 256],
  ['shield-192.png', 192],
  ['shield-apple-touch.png', 180],
  ['favicon-32.png', 32],
]) {
  await sharp(square)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT_DIR}/${name}`)
  console.log(`wrote ${OUT_DIR}/${name} (${size}x${size})`)
}

// Contact sheet over navy so the cutout can be eyeballed against a dark page.
await sharp({
  create: { width: 640, height: 640, channels: 4, background: '#0b2545' },
})
  .composite([{ input: await sharp(square).resize(560, 560).toBuffer(), gravity: 'center' }])
  .png()
  .toFile(`${DEBUG_DIR}/check-dark.png`)

console.log(`\nsource ${w0}x${h0} -> trimmed ${tm.width}x${tm.height} -> square ${box}x${box}`)
console.log(`preview: ${DEBUG_DIR}/check-dark.png`)
