// The particles' sheet, drawn from nothing: `particles.png` and `particles.json`, a TexturePacker
// JSON (a hash of frames, each pivoted on its middle, and `animations`, one clip a name) that the
// scene's catalogue names `particles`. `assets/demo_particle3d.bake.ts` runs `draw`. Every frame is
// white, shaped by its alpha, so an effect's `tint` colours it whole and the same frame serves an
// additive flash and a normal-blended puff of smoke. The noise is a hash of the pixel, so the sheet is
// the same every time it is drawn. Two pixels of nothing lie between frames, so no frame's filtering
// picks up its neighbour.
//
//   glow     a soft round light, falling to nothing at its edge: flashes, fire, embers, heads.
//   ring     a thin ring: a blast's shock.
//   smoke    four frames of a puff, round and dense, then broken up and thin: a particle plays them
//            over its life, so a puff thins out as it fades.
//   star     a four-pointed flash: a muzzle's.
//   spark    a streak, its head at the right and its tail fading to the left: stretched sparks and
//            tracers, drawn head first.
//   beam     a bar, bright at its core across its height: a beam, drawn its length.
//   debris   a rough dark chunk: what a blast throws.
import fs from 'node:fs'
import path from 'node:path'
import { encodePng } from '#plugins/loader/loader.sim.ts'

const W = 336, H = 132

// A number from 0 to 1 for a whole point, the same each time.
const hash = (x: number, y: number, seed: number) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
const smooth = (t: number) => t * t * (3 - 2 * t)
// Value noise at a point, from 0 to 1.
const noise = (x: number, y: number, seed: number) => {
  const x0 = Math.floor(x), y0 = Math.floor(y)
  const fx = smooth(x - x0), fy = smooth(y - y0)
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}
// Four octaves of it, from 0 to 1.
const fbm = (x: number, y: number, seed: number) => {
  let sum = 0, amp = 0.5, f = 1
  for (let o = 0; o < 4; o++) {
    sum += amp * noise(x * f, y * f, seed + o * 17)
    amp *= 0.5
    f *= 2
  }
  return sum / 0.9375
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

type Shade = (u: number, v: number) => [grey: number, alpha: number]
type Frame = { id: string; x: number; y: number; w: number; h: number; shade: Shade }

// u and v run from −1 to 1 across and down a frame, through its middle.
const glow: Shade = (u, v) => {
  const r2 = u * u + v * v
  const edge = Math.exp(-4)
  return [1, clamp01((Math.exp(-4 * r2) - edge) / (1 - edge))]
}
const ring: Shade = (u, v) => {
  const r = Math.hypot(u, v)
  return [1, Math.exp(-(((r - 0.78) / 0.09) ** 2)) * clamp01((1 - r) * 8)]
}
// Puff k of four: the noise eats more of it, and less of it is left, the later it is.
const smoke = (k: number): Shade => (u, v) => {
  const r = Math.hypot(u, v)
  const n = fbm(u * 2.2 + 5, v * 2.2 + 5, 11 + k * 3)
  const body = clamp01((1 - r) * 1.6) ** 1.2
  const cut = 0.25 + k * 0.12
  const alpha = clamp01((n * body * 1.9 - cut) / (1 - cut)) * (1 - k * 0.12)
  const grey = 0.72 + 0.28 * fbm(u * 3 + 9, v * 3 + 9, 41 + k)
  return [grey, alpha]
}
const star: Shade = (u, v) => {
  const core = Math.exp(-6 * (u * u + v * v))
  const spikes = Math.max(Math.exp(-(Math.abs(u) * 3 + v * v * 120)), Math.exp(-(Math.abs(v) * 3 + u * u * 120)))
  return [1, clamp01((core + spikes * 0.9) * clamp01((1 - Math.hypot(u, v)) * 3))]
}
const spark: Shade = (u, v) => {
  const t = (u + 1) / 2
  const across = Math.exp(-((v / 0.45) ** 2))
  const head = clamp01((1 - t) * 10)
  return [1, clamp01(t ** 1.6 * across * head + Math.exp(-(((t - 0.9) / 0.08) ** 2) - (v / 0.35) ** 2) * 0.6)]
}
const beam: Shade = (_u, v) => [1, clamp01(Math.exp(-((v / 0.3) ** 2)) + 0.35 * Math.exp(-((v / 0.75) ** 2)))]
const debris: Shade = (u, v) => {
  const a = Math.atan2(v, u)
  const edge = 0.62 + 0.3 * noise(Math.cos(a) * 1.6 + 3, Math.sin(a) * 1.6 + 3, 77)
  const r = Math.hypot(u, v)
  return [0.35 + 0.4 * fbm(u * 3 + 2, v * 3 + 2, 91), clamp01((edge - r) * 12)]
}

const FRAMES: Frame[] = [
  { id: 'glow', x: 0, y: 0, w: 64, h: 64, shade: glow },
  { id: 'ring', x: 66, y: 0, w: 64, h: 64, shade: ring },
  { id: 'smoke0', x: 132, y: 0, w: 64, h: 64, shade: smoke(0) },
  { id: 'smoke1', x: 198, y: 0, w: 64, h: 64, shade: smoke(1) },
  { id: 'smoke2', x: 264, y: 0, w: 64, h: 64, shade: smoke(2) },
  { id: 'smoke3', x: 0, y: 66, w: 64, h: 64, shade: smoke(3) },
  { id: 'star', x: 66, y: 66, w: 64, h: 64, shade: star },
  { id: 'spark', x: 132, y: 66, w: 64, h: 16, shade: spark },
  { id: 'beam', x: 132, y: 84, w: 32, h: 16, shade: beam },
  { id: 'debris', x: 198, y: 66, w: 16, h: 16, shade: debris },
]
const CLIPS: Record<string, string[]> = {
  glow: ['glow'], ring: ['ring'], smoke: ['smoke0', 'smoke1', 'smoke2', 'smoke3'], star: ['star'],
  spark: ['spark'], beam: ['beam'], debris: ['debris'],
}

// Writes the sheet's picture and its JSON into `folder`, and hands back the two paths.
export function draw(folder: string): string[] {
  const data = new Uint8ClampedArray(W * H * 4)
  for (const f of FRAMES) {
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const u = ((x + 0.5) / f.w) * 2 - 1, v = ((y + 0.5) / f.h) * 2 - 1
        const [grey, alpha] = f.shade(u, v)
        const i = ((f.y + y) * W + f.x + x) * 4
        const g = Math.round(clamp01(grey) * 255)
        data.set([g, g, g, Math.round(clamp01(alpha) * 255)], i)
      }
    }
  }
  fs.mkdirSync(folder, { recursive: true })
  const png = path.join(folder, 'particles.png')
  const json = path.join(folder, 'particles.json')
  fs.writeFileSync(png, encodePng({ width: W, height: H, data, text: {} }))
  const frames = Object.fromEntries(FRAMES.map(f => [f.id, { frame: { x: f.x, y: f.y, w: f.w, h: f.h }, pivot: { x: 0.5, y: 0.5 } }]))
  fs.writeFileSync(json, JSON.stringify({ frames, animations: CLIPS, meta: { image: 'particles.png', size: { w: W, h: H } } }, null, 2) + '\n')
  return [png, json]
}
