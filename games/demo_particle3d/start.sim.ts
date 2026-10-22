// Where a seat's craft starts: a `start` actor of the scene, one per slot, a row at its `pos` [x, y, z]
// for the slot in `slot`, pointing along its `yaw` and down by its `pitch`. The `player` row stands
// its craft on the start of its slot. It has no rule and is not drawn.
import type { Kind } from '#engine/engine.ts'

export const start: Kind = {}
