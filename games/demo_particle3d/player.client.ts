// A seat's craft, its `player` row, drawn for every seat's row (`craft`, `assets/demo_particle3d.json`):
// a hull `hull.length` long tapering from its `tail` radius to its `nose`, wings and a fin, each a box
// of its `size` at its `at`, and a canopy, a ball of `radius` stretched by `scale` at its `at`, each of
// its `colour`, all of the craft's `roughness` and `metalness`, the round parts cut in `segments`; the
// craft's own frame is [left, up, forward]. It stands on the row's `pos`, pointing along its yaw and
// down by its pitch. For the seat's own row, the one that is `mine`, its keys,
// its camera and its reticle: a flat ring from `reticle.inner` to `reticle.outer` metres across of
// `reticle.colour`, in `reticle.segments`, lying `reticle.lift` metres over the row's `aim`.
//
// Every key is the player's definition (`keys`), each naming the `player` row's act of the same name
// (`player.sim.ts`): the stick (turn left and right, fly forward and back), the tilt (up and down),
// and `up`, `down` and `fast` held; and each shot's own `key` sends `fire` with the shot's name. The
// mouse dragged with `drag` held sends `look` with its pixels times `sens`, right turning the craft
// right and down tilting it down; the wheel sends `pace`. No click takes the pointer. Each frame
// chasecamera3d follows the row.
import type * as THREE from 'three'
import type { Row } from '#engine/engine.ts'
import type { Plugins } from '#engine/browser.ts'
import type { Binds, Input } from '#plugins/player/player.plugin.ts'
import { def } from '#plugins/loader/loader.sim.ts'

let craft: THREE.Group
let euler: THREE.Euler
let reticle: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | undefined
let lift = 0
// Whether the row is this seat's.
let ours = false

export function setup(row: Row, plugins: Plugins) {
  const three = plugins.render3d.THREE as typeof THREE
  const k = def(plugins.wire, row.kind)
  const c = k.craft
  const paint = (colour: string) => plugins.render3d.dress(new three.MeshStandardMaterial({ color: colour, roughness: c.roughness, metalness: c.metalness }))
  // The hull's axis turned from up to forward, so its nose points along +z.
  const hullShape = new three.CylinderGeometry(c.hull.nose, c.hull.tail, c.hull.length, c.segments)
  hullShape.rotateX(Math.PI / 2)
  const hull = new three.Mesh(hullShape, paint(c.hull.colour))
  const box = (part: { colour: string; size: number[]; at: number[] }) => {
    const mesh = new three.Mesh(new three.BoxGeometry(part.size[0], part.size[1], part.size[2]), paint(part.colour))
    mesh.position.fromArray(part.at)
    return mesh
  }
  const canopy = new three.Mesh(new three.SphereGeometry(c.canopy.radius, c.segments, c.segments), paint(c.canopy.colour))
  canopy.scale.fromArray(c.canopy.scale)
  canopy.position.fromArray(c.canopy.at)
  craft = new three.Group()
  craft.add(hull, box(c.wings), box(c.fin), canopy)
  craft.traverse(o => { o.castShadow = true; o.receiveShadow = true })
  euler = new three.Euler(0, 0, 0, 'YXZ')
  plugins.render3d.scene.add(craft)
  ours = row.data.mine === true
  if (ours) {
    const r = k.reticle
    const ring = new three.RingGeometry(r.inner, r.outer, r.segments)
    ring.rotateX(-Math.PI / 2)
    reticle = new three.Mesh(ring, new three.MeshBasicMaterial({ color: r.colour }))
    lift = r.lift
    plugins.render3d.scene.add(reticle)
    const keys = k.keys
    // chasecamera3d looks along (sin yaw, cos yaw), so a larger yaw turns the view left: right on the
    // mouse is less yaw. A larger pitch lifts the camera over the craft and looks down.
    const look = (dx: number, dy: number): Input => ['look', -dx * k.sens, dy * k.sens]
    const press: Record<string, Input> = {}
    for (const [name, shot] of Object.entries(k.shots as Record<string, { key: string }>)) press[shot.key] = ['fire', name]
    plugins.player.bind({
      stick: [{ keys: keys.stick, send: (x, y) => ['stick', x, y] }],
      axis: [{ keys: keys.tilt, send: v => ['tilt', v] }],
      hold: [
        { keys: keys.up, send: v => ['up', v] },
        { keys: keys.down, send: v => ['down', v] },
        { keys: keys.fast, send: v => ['fast', v] },
      ],
      press,
      drag: { key: keys.drag, send: look },
      wheel: dy => ['pace', dy],
    } satisfies Binds)
  }
  tick(row, plugins)
}

export function tick(row: Row, plugins: Plugins) {
  craft.position.fromArray(row.data.pos)
  craft.quaternion.setFromEuler(euler.set(row.data.look.pitch, row.data.look.yaw, 0, 'YXZ'))
  if (!ours) return
  reticle!.position.set(row.data.aim[0], row.data.aim[1] + lift, row.data.aim[2])
  plugins.chasecamera3d.follow(row.id)
}

export function remove(plugins: Plugins) {
  plugins.render3d.scene.remove(craft)
  craft.traverse(o => {
    const mesh = o as THREE.Mesh<THREE.BufferGeometry, THREE.Material>
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    mesh.material.dispose()
  })
  if (!ours) return
  plugins.render3d.scene.remove(reticle!)
  reticle!.geometry.dispose()
  reticle!.material.dispose()
  plugins.player.unbind()
}
