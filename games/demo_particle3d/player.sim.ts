// The row one seat possesses: a small craft over the yard, which the camera chases (chasecamera3d,
// `look.dist` metres behind and `lift` over it), flown by the keys and firing particle3d's effects
// where it aims. `addons/player` spawns it and writes the slot it gave the connection into `seat`, and
// every seat is sent it. Every number is the player's definition in `assets/demo_particle3d.json`.
//
// The row: `seat`, and `stood`, whether it stands yet. Its own:
//   pos       [x, y, z], the craft, in metres.
//   look      `{ yaw, pitch, dist }`: chasecamera3d's orbit; the craft points along yaw and down by
//             pitch.
//   lift      metres the camera's pivot stands over the craft.
//   stick     [turn, forward]: the turn keys' way, right positive, and the fly keys', forward
//             positive; `tilt`, the tilt keys' way, down positive; `up` and `down`, the climb keys
//             held; `fast`, the boost key held.
//   pace      the fly speed's multiplier, which the wheel moves, from `pace.min` to `pace.max`.
//   aim       [x, y, z], where the line through the pivot along the way the craft points meets the
//             ground, y = 0, within `range` metres; else the point `range` metres along it.
//   kept      the ledger entries this craft holds on to: `{ id, at, to? }`, each moved every step to
//             where `at` and `to` name (below) while the ledger holds it.
//
// `before` stands it once on the scene's `start` actor for its slot, at its `pos`, pointing along its
// `yaw` and down by its `pitch`. Each step after, it turns `turn` radians a second and tilts `tilt`,
// flies `speed`·pace metres a second along the way it points, forward and back, and `climb`·pace
// straight up or down, all of it `boost` times faster while `fast` is held; it never comes nearer
// than `clear` metres to the ground, nor goes higher than `ceiling`. Then its `aim` is found again
// and each entry it keeps is moved.
//
// `fire(name)` fires the shot of that name in the definition's `shots`: each of its `emits` is one
// `emit` of particle3d's ledger (`plugins/particle3d/particle3d.sim.ts`), its `effect` at a point:
//   at        `aim`, or `gun`, the definition's `gun` offset from the craft, [right, up, forward] in
//             the craft's own frame; with `lift`, [x, y, z] metres added to it.
//   dir       `aim`, the way from the point to the aim, or a direction [x, y, z].
//   to        `aim`.
//   life, floor, fly, land   the spawn's own, as given.
//   ride      a kind: a row of it is spawned with its `centre` and its `pos` on the point, and the
//             effect is emitted there `from` that row, so it rides the row's `pos` for as long as the
//             row lasts.
//   keep      the craft keeps the entry: each step its `at` is moved to where `at` names, and its `to`
//             to the aim, so a beam sweeps as the craft turns.
//
// The acts are the page's keys: `stick(x, y)` (y down, as a stick reads), `tilt(v)`, `up`, `down`
// and `fast` (1 held, 0 let go), `pace(d)` the wheel, `look(dyaw, dpitch)` the mouse dragged, and
// `fire(name)`. A seat's message arrives from outside the program, so each act refuses arguments of
// the wrong kind and writes nothing.
import type { Kind, Row, W } from '#engine/engine.ts'
import { def } from '#plugins/loader/loader.sim.ts'
import { emit, entry, type Spawn } from '#plugins/particle3d/particle3d.sim.ts'
import * as math from '#plugins/math/math.sim.ts'

type Emit = Spawn & {
  effect: string; at: 'aim' | 'gun'; lift?: number[]; dir?: 'aim' | number[]; to?: 'aim'
  ride?: string; keep?: boolean
}
type Kept = { id: number; at: 'aim' | 'gun'; lift?: number[]; to?: 'aim' }

const wrap = (a: number) => a - 2 * Math.PI * Math.ceil((a - Math.PI) / (2 * Math.PI))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const finite = (...v: unknown[]) => v.every(x => typeof x === 'number' && Number.isFinite(x))
const held = (v: unknown) => v === 0 || v === 1
const way = (v: unknown) => typeof v === 'number' && Math.abs(v) <= 1
const add = (a: number[], b: number[]) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

// The craft's own axes in the world: the way it points, its up and its right.
function axes(d: any) {
  const { yaw, pitch } = d.look
  const cy = math.cos(yaw), sy = math.sin(yaw), cp = math.cos(pitch), sp = math.sin(pitch)
  return { forward: [sy * cp, -sp, cy * cp], up: [sy * sp, cp, cy * sp], right: [-cy, 0, sy] }
}

// Where the line through the pivot along the way the craft points meets the ground, within `range`.
function aimOf(d: any, range: number) {
  const { forward } = axes(d)
  const from = [d.pos[0], d.pos[1] + d.lift, d.pos[2]]
  const reach = forward[1] < 0 ? Math.min(range, from[1] / -forward[1]) : range
  const at = [0, 1, 2].map(i => from[i] + forward[i] * reach)
  if (reach < range) at[1] = 0
  return at
}

// The gun's muzzle in the world: the definition's offset, right, up and forward of the craft.
function gunOf(d: any, k: any) {
  const { forward, up, right } = axes(d)
  return [0, 1, 2].map(i => d.pos[i] + right[i] * k.gun[0] + up[i] * k.gun[1] + forward[i] * k.gun[2])
}

const pointOf = (d: any, k: any, at: 'aim' | 'gun', lift?: number[]) => {
  const p = at === 'gun' ? gunOf(d, k) : [...d.aim]
  return lift ? add(p, lift) : p
}

function fly(me: Row, w: W, dt: number) {
  const d = me.data
  const k = def(w, me.kind)
  const boost = d.fast ? k.boost : 1
  const [turn, ahead] = d.stick
  d.look = {
    ...d.look,
    yaw: wrap(d.look.yaw - turn * k.turn * dt),
    pitch: clamp(d.look.pitch + d.tilt * k.tilt * dt, k.camera.minPitch, k.camera.maxPitch),
  }
  const { forward } = axes(d)
  const run = k.speed * d.pace * boost * ahead, rise = k.climb * d.pace * boost * ((d.up ? 1 : 0) - (d.down ? 1 : 0))
  const x = d.pos[0] + forward[0] * run * dt
  const z = d.pos[2] + forward[2] * run * dt
  const y = d.pos[1] + (forward[1] * run + rise) * dt
  d.pos = [x, clamp(y, k.clear, k.ceiling), z]
  d.aim = aimOf(d, k.range)
}

// Each kept entry moved to where it is kept, and the ones the ledger has let go of let go.
function keep(me: Row, w: W) {
  const d = me.data
  const k = def(w, me.kind)
  d.kept = (d.kept as Kept[]).filter(c => {
    const e = entry(w, c.id)
    if (!e) return false
    e.at = pointOf(d, k, c.at, c.lift)
    if (c.to) e.to = [...d.aim]
    return true
  })
}

export const player: Kind = {
  before(me, _dt, w) {
    const d = me.data
    if (d.stood) return
    const start = w.find('start', s => s.data.slot === d.seat).data
    d.pos = [...start.pos]
    d.look = { ...d.look, yaw: start.yaw, pitch: start.pitch }
    d.aim = aimOf(d, def(w, me.kind).range)
    d.stood = true
  },
  tick(me, dt, w) {
    if (!me.data.stood) return
    fly(me, w, dt)
    keep(me, w)
  },
  acts: {
    stick(me, _w, _seat, x: unknown, y: unknown) {
      if (way(x) && way(y)) me.data.stick = [x, 0 - (y as number)]
    },
    tilt(me, _w, _seat, v: unknown) { if (way(v)) me.data.tilt = v },
    up(me, _w, _seat, v: unknown) { if (held(v)) me.data.up = !!v },
    down(me, _w, _seat, v: unknown) { if (held(v)) me.data.down = !!v },
    fast(me, _w, _seat, v: unknown) { if (held(v)) me.data.fast = !!v },
    pace(me, w, _seat, by: unknown) {
      if (!finite(by)) return
      const p = def(w, me.kind).pace
      me.data.pace = clamp(me.data.pace * math.exp(-(by as number) * p.step), p.min, p.max)
    },
    look(me, w, _seat, dyaw: unknown, dpitch: unknown) {
      if (!finite(dyaw, dpitch)) return
      const c = def(w, me.kind).camera
      const l = me.data.look
      me.data.look = { ...l, yaw: wrap(l.yaw + (dyaw as number)), pitch: clamp(l.pitch + (dpitch as number), c.minPitch, c.maxPitch) }
    },
    fire(me, w, _seat, name: unknown) {
      const d = me.data
      if (!d.stood) return
      const k = def(w, me.kind)
      if (typeof name !== 'string' || !Object.hasOwn(k.shots, name)) return
      for (const e of k.shots[name].emits as Emit[]) {
        const { effect, at, lift, dir, to, ride, keep: kept, ...spawn } = e
        const point = pointOf(d, k, at, lift)
        const s: Spawn = { ...spawn }
        if (to === 'aim') s.to = [...d.aim]
        if (dir === 'aim') {
          const gap = [0, 1, 2].map(i => d.aim[i] - point[i])
          const len = math.hypot(gap[0], gap[1], gap[2])
          if (len > 0) s.dir = gap.map(g => g / len)
        } else if (dir) s.dir = [...dir]
        if (ride) s.from = w.spawn(ride, { centre: point, pos: point }).id
        const made = emit(w, effect, point, s)
        if (kept) d.kept = [...d.kept, { id: made.id, at, ...(lift && { lift }), ...(to && { to }) }]
      }
    },
  },
}
