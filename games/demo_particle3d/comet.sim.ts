// A comet: a point that circles its `centre` and goes, which a craft's shot spawns so an effect can
// ride it (`player.sim.ts`, `ride`). It is drawn by nothing but the effect that rides it. Every number
// is its definition in `assets/demo_particle3d.json`.
//
// The row: `centre` [x, y, z], the point it circles; `t`, the seconds it has flown; `pos`, where it is.
// Each step it is `t` seconds round a circle about the centre, turning `spin` radians a second, its
// way out from the centre growing to `radius` metres over its first `grow` seconds, so it spirals out
// from where it was spawned, and rising and falling `bob` metres, `bobs` times a turn. After `life`
// seconds it ends, and what rides it with it.
import type { Kind } from '#engine/engine.ts'
import { def } from '#plugins/loader/loader.sim.ts'
import * as math from '#plugins/math/math.sim.ts'

export const comet: Kind = {
  tick(me, dt, w) {
    const d = me.data
    const k = def(w, me.kind)
    d.t += dt
    if (d.t >= k.life) return w.end(me)
    const a = d.t * k.spin
    const r = k.radius * Math.min(1, d.t / k.grow)
    d.pos = [d.centre[0] + r * math.sin(a), d.centre[1] + k.bob * math.sin(a * k.bobs), d.centre[2] + r * math.cos(a)]
  },
}
