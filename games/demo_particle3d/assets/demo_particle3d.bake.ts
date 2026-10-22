// demo_particle3d's bake (`yarn bake demo_particle3d`): the particles' sheet, which
// `particles/particles.draw.ts` draws from nothing into `particles/`. It reads nothing from the
// library.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Tools } from '#scripts/bake.ts'
import { draw } from './particles/particles.draw.ts'

export default async (_tools: Tools) => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  for (const out of draw(path.join(here, 'particles'))) console.log('wrote', path.relative(process.cwd(), out))
}
