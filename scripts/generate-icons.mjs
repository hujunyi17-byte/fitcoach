// 生成 PWA 占位图标（无第三方依赖，纯 Node 实现 PNG 编码）
// 运行：node scripts/generate-icons.mjs
// 更换品牌色后重新运行即可更新图标
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// 品牌色（与 index.css 的 --color-primary 保持一致）
const BG = [16, 185, 129] // #10b981
const FG = [255, 255, 255] // 白色

// ---------- CRC32 ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([length, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0 // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---------- 绘制白色哑铃 ----------
function render(size, scale) {
  const px = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const s = size * scale
  const barHalfLen = 0.22 * s
  const barHalfH = 0.04 * s
  const weightOffset = 0.17 * s
  const weightHalfW = 0.06 * s
  const weightHalfH = 0.15 * s

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      px[i] = BG[0]
      px[i + 1] = BG[1]
      px[i + 2] = BG[2]
      px[i + 3] = 255

      const dx = x - cx
      const dy = y - cy
      const inBar = Math.abs(dy) <= barHalfH && Math.abs(dx) <= barHalfLen
      const inLeft = Math.abs(dx + weightOffset) <= weightHalfW && Math.abs(dy) <= weightHalfH
      const inRight = Math.abs(dx - weightOffset) <= weightHalfW && Math.abs(dy) <= weightHalfH

      if (inBar || inLeft || inRight) {
        px[i] = FG[0]
        px[i + 1] = FG[1]
        px[i + 2] = FG[2]
      }
    }
  }
  return px
}

writeFileSync(join(outDir, 'icon-192.png'), encodePNG(192, 192, render(192, 1)))
writeFileSync(join(outDir, 'icon-512.png'), encodePNG(512, 512, render(512, 1)))
writeFileSync(join(outDir, 'icon-maskable-512.png'), encodePNG(512, 512, render(512, 0.85)))
writeFileSync(join(outDir, 'apple-touch-icon.png'), encodePNG(180, 180, render(180, 1)))
console.log('✓ PWA 图标已生成到 public/icons/')
