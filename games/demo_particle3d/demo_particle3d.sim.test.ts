// demo_particle3d: the manager booted as its page boots it and main loaded; a seat joins, its craft
// stands on its slot's start, flies forward on the stick, and its blast key puts a blast on
// particle3d's ledger where the craft aims, on the ground.
import { expect, test } from 'vitest'
import { boot, type Scene } from '#engine/engine.ts'
import { connection, load, manager, type Down } from '#addons/scenemanager/scenemanager.addon.ts'
import { sim } from './demo_particle3d.sim.ts'
import file from './demo_particle3d.scene.json' with { type: 'json' }
import defs from './assets/demo_particle3d.json' with { type: 'json' }

const DT = file.prefabs.engine.dt

test('a seat joins main, its craft stands on its start, the stick flies it, and the blast key blasts the ground it aims at', async () => {
  const truth = boot(file as Scene, sim)
  const room = (await load(truth, import.meta.url)).get('main')!
  const heard: Down[] = []
  const seat = connection(manager(truth), d => heard.push(d))
  truth.step(DT)
  const start = room.rows.find(r => r.kind === 'start' && r.data.slot === 0)!.data
  const craft = () => room.rows.find(r => r.kind === 'player')!.data
  expect(craft().pos).toEqual(start.pos)

  const last = heard[heard.length - 1]
  const me = last.packet.rows.find(r => r.kind === 'player')!
  const send = (seq: number, action: string, args: unknown[]) =>
    seat.take({ scene: last.scene, seat: last.seat, msg: { seq, n: last.packet.n, id: me.id, action, args } as any })
  send(1, 'stick', [0, -1])
  for (let i = 0; i < 60; i++) truth.step(DT)
  expect(craft().pos[2]).toBeGreaterThan(start.pos[2] + defs.player.speed * 0.5)

  send(2, 'stick', [0, 0])
  send(3, 'fire', ['blast'])
  truth.step(DT)
  const blast = room.rows.find(r => r.kind === 'particle3d')!.data.live.find((e: any) => e.effect === 'blast')
  expect(blast.at).toEqual(craft().aim)
  expect(blast.at[1]).toBe(0)
})
