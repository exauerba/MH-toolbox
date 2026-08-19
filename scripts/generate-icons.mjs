/**
 * Generates the PWA app icons (public/pwa-*.png) from a 16×16 pixel-art grid
 * using only Node built-ins (zlib for PNG compression). Run: node scripts/generate-icons.mjs
 * Outputs: pwa-192.png (rounded, 192), pwa-512.png (rounded, 512), pwa-512-maskable.png (full-bleed, 512)
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---- pixel art (16×16) ----
// . = background (brand rose), L = jar lid (walnut), B = jar body (honey), H = highlight
const ART = [
  '................',
  '................',
  '..LLLLLLLLLLLL..',
  '..LLLLLLLLLLLL..',
  '..BBBBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BBHHBBBBBBBB..',
  '..BBHHBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..LLLLLLLLLLLL..',
  '................',
]

const COLORS = {
  L: [116, 85, 47], // walnut 600 #74552f
  B: [238, 188, 93], // jar 300 #eebc5d
  H: [251, 236, 203], // jar 100 #fbeccb
}
const BG = [197, 106, 79] // brand 500 #c56a4f

// ---- minimal PNG encoder ----
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function pngEncode(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // bytes 10-12: compression/filter/interlace = 0
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

// ---- rendering ----
function roundedRectContains(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - 1 - radius)
  const cy = Math.min(Math.max(y, radius), size - 1 - radius)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= radius * radius
}

function render(size, fullBleed) {
  const scale = size / ART.length // integer factors: 192/16=12, 512/16=32
  const radius = Math.max(1, size * 0.18)
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = ART[Math.floor(y / scale)][Math.floor(x / scale)]
      let color
      if (cell !== '.') {
        color = COLORS[cell]
      } else if (fullBleed || roundedRectContains(x, y, size, radius)) {
        color = BG
      } else {
        color = [0, 0, 0, 0] // transparent
      }
      const i = (y * size + x) * 4
      rgba[i] = color[0]
      rgba[i + 1] = color[1]
      rgba[i + 2] = color[2]
      rgba[i + 3] = color.length === 4 ? color[3] : 255
    }
  }
  return pngEncode(size, size, rgba)
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(outDir, { recursive: true })
for (const [file, size, fullBleed] of [
  ['pwa-192.png', 192, false],
  ['pwa-512.png', 512, false],
  ['pwa-512-maskable.png', 512, true],
]) {
  writeFileSync(join(outDir, file), render(size, fullBleed))
  console.log(`wrote public/${file}`)
}
