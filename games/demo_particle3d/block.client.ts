// A block's look: a box of its row's `size`, its bottom's middle on its row's `pos`, of the
// definition's `colour` and `roughness` (`assets/demo_particle3d.json`), casting and taking shadows
// and lit by the particles' lights.
import type * as THREE from 'three'
import type { Row } from '#engine/engine.ts'
import type { Plugins } from '#engine/browser.ts'
import { def } from '#plugins/loader/loader.sim.ts'

let box: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>

export function setup(row: Row, plugins: Plugins) {
  const three = plugins.render3d.THREE as typeof THREE
  const k = def(plugins.wire, row.kind)
  const [w, h, d] = row.data.size
  box = new three.Mesh(new three.BoxGeometry(w, h, d), plugins.render3d.dress(new three.MeshStandardMaterial({ color: k.colour, roughness: k.roughness })))
  box.castShadow = true
  box.receiveShadow = true
  plugins.render3d.scene.add(box)
  tick(row)
}

export function tick(row: Row) {
  box.position.set(row.data.pos[0], row.data.pos[1] + row.data.size[1] / 2, row.data.pos[2])
}

export function remove(plugins: Plugins) {
  plugins.render3d.scene.remove(box)
  box.geometry.dispose()
  box.material.dispose()
}
