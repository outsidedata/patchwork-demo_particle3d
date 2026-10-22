# demo_particle3d

The demo of the `particle3d` plugin. You fly a small craft over a yard at dusk, with a chase camera
behind it, and fire particle3d's effects at the spot it aims at, which a gold ring on the ground
marks. Each number key fires one:

| key | effect | what it shows |
|---|---|---|
| 1 | blast | an explosion: a flash that lights the yard, a shock ring, a fireball that cools from orange to red, smoke, dust, stretched sparks and debris that fall and come to rest on the ground |
| 2 | sparks | three seconds of welding sparks: a stream of stretched sparks under gravity, a flickering lit glow, wisps of smoke |
| 3 | smoke | eight seconds of a smoke column: puffs that grow, rise, spin and thin out, a fire at the base, embers |
| 4 | gun | a muzzle flash at the craft's gun, and a tracer that flies to the aim and throws an impact where it lands |
| 5 | laser | a beam from the gun to the aim, burning the ground where it hits; the craft keeps it on the gun and the aim, so it sweeps as you turn |
| 6 | flares | coloured flares that each carry a real point light (lights3d), lighting the ground and the blocks round them |
| 7 | comet | a comet row that spirals out and circles the aim; its trail is an effect that rides the row, and when the row ends the trail throws a burst where it was |
| 8 | rocket | a rocket that flies from the gun to the aim and throws a blast and smoke where it lands |

All the effects are in `assets/effects.json`, drawn from one sheet, `assets/particles/`.

## Controls

- W and S fly forward and back; A and D turn; Q and E tilt up and down
- Space climbs, C sinks, Shift boosts
- the right mouse button dragged looks; the wheel changes the flying pace
- 1 to 8 fire the effects

## The dev page

`dev.html` is the demo's main page. Three's stats panel is at the top left. The panel holds
`world.particle3d`'s `hold`, the effects file's `cap`, `alphaTest` and `ppm`, and a render3d folder
(pixel ratio, exposure, tone mapping, AO and bloom). Changes apply to the running page only; "copy
world.particle3d JSON" and "copy effects file numbers JSON" copy the values for the files, and
"reset to the file" puts the files' values back.

## Playing it

```
yarn vite
```

then open `/games/demo_particle3d/dev.html`, or `/games/demo_particle3d/index.html` for the plain
game. Against its server:

```
node --experimental-strip-types games/demo_particle3d/demo_particle3d.server.ts
```

then open `/games/demo_particle3d/client.html`.

## Remaking the art

`yarn bake demo_particle3d` runs `assets/demo_particle3d.bake.ts`, which runs
`assets/particles/particles.draw.ts`. That script draws the particle sheet from nothing (a glow, a
ring, four puffs of smoke, a muzzle star, a spark, a beam and a chunk of debris, each white and
shaped by its alpha) and writes `assets/particles/particles.png` and `particles.json`. It reads
nothing from the library. Everything else in the scene is drawn from three.js shapes.
