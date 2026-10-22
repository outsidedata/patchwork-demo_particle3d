// The floor's look: a square of `size` metres of `colour` and `roughness`, which takes the shadows and
// the particles' light, and over it a grid of `grid.size` metres cut `grid.divisions` times, its lines
// `grid.lines` and its middle lines `grid.centre`, `grid.lift` metres up so it never fights the floor
// (`assets/demo_particle3d.json`).
import type * as THREE from 'three'
import type { Row } from '#engine/engine.ts'
import type { Plugins } from '#engine/browser.ts'
import { def } from '#plugins/loader/loader.sim.ts'

let floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>
let grid: THREE.GridHelper

export function setup(row: Row, plugins: Plugins) {
  const three = plugins.render3d.THREE as typeof THREE
  const k = def(plugins.wire, row.kind)
  floor = new three.Mesh(
    new three.PlaneGeometry(k.size, k.size),
    plugins.render3d.dress(new three.MeshStandardMaterial({ color: k.colour, roughness: k.roughness })),
  )
  floor.quaternion.setFromAxisAngle(new three.Vector3(1, 0, 0), -Math.PI / 2)
  floor.receiveShadow = true
  grid = new three.GridHelper(k.grid.size, k.grid.divisions, k.grid.centre, k.grid.lines)
  grid.position.y = k.grid.lift
  plugins.render3d.scene.add(floor, grid)
}

export function tick() {}

export function remove(plugins: Plugins) {
  plugins.render3d.scene.remove(floor, grid)
  floor.geometry.dispose()
  floor.material.dispose()
  grid.dispose()
}
