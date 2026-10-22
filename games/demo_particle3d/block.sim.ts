// A block of the yard: a box standing on its row's `pos` [x, y, z], its bottom's middle, `size`
// [x, y, z] metres, one `actors` entry each, for the effects to light, smoke round and land by. It has
// no rule; `block.client.ts` draws it.
import type { Kind } from '#engine/engine.ts'

export const block: Kind = {}
