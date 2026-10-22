// The yard's light and air (`assets/demo_particle3d.json`): a key light of `key.colour` and
// `key.intensity` shining from `key.at` toward the middle, casting shadows over a box `key.shadow.half`
// metres each way of the middle, `key.shadow.far` metres deep, onto a map `key.shadow.map` texels
// square, with `key.shadow.bias`; a hemisphere light of `fill.sky` over `fill.ground` at
// `fill.intensity`; and fog of `fog.colour` from `fog.near` to `fog.far` metres, which the scene's
// background matches.
import type * as THREE from 'three'
import type { Row } from '#engine/engine.ts'
import type { Plugins } from '#engine/browser.ts'
import { def } from '#plugins/loader/loader.sim.ts'

let key: THREE.DirectionalLight
let fill: THREE.HemisphereLight

export function setup(row: Row, plugins: Plugins) {
  const three = plugins.render3d.THREE as typeof THREE
  const k = def(plugins.wire, row.kind)
  key = new three.DirectionalLight(k.key.colour, k.key.intensity)
  key.position.fromArray(k.key.at)
  key.castShadow = true
  const s = k.key.shadow
  const cam = key.shadow.camera
  cam.left = -s.half
  cam.right = s.half
  cam.top = s.half
  cam.bottom = -s.half
  cam.far = s.far
  cam.updateProjectionMatrix()
  key.shadow.mapSize.set(s.map, s.map)
  key.shadow.bias = s.bias
  fill = new three.HemisphereLight(k.fill.sky, k.fill.ground, k.fill.intensity)
  plugins.render3d.scene.add(key, key.target, fill)
  plugins.render3d.scene.fog = new three.Fog(k.fog.colour, k.fog.near, k.fog.far)
}

export function tick() {}

export function remove(plugins: Plugins) {
  plugins.render3d.scene.remove(key, key.target, fill)
  plugins.render3d.scene.fog = null
  key.dispose()
  fill.dispose()
}
