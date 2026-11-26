# skyward-archipelago

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/urayfazli/skyward-archipelago/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/urayfazli/skyward-archipelago/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Skyward Archipelago** is an original 3D flight game that runs entirely in the browser from static files — no build step, no network requests. Pilot the little orange Senja Skimmer in chase view over a golden-hour archipelago of seven islands: take off from the home runway, fly all twelve rings of the course in order (the next one always glows gold, cleared rings turn green), then come home and land for the big bonus. Fuel is the quiet enemy — rings drip a little back into the tank, only a landing refills it — and the flight model rewards discipline: bank to turn, keep your speed up or stall, and bleed speed off before you try to touch down.

Played with keyboard and mouse. Shift/Ctrl work the throttle, W A S D or the arrow keys pitch and roll, B or Space brakes, dragging the mouse steers, and the wheel trims the throttle. The HUD shows altitude, speed, heading and climb rate, an artificial horizon, throttle and fuel gauges, score, ring progress and a mission timer. Engine, ring and touchdown sounds are synthesised live with WebAudio — there are no audio files. The world (island terrain with an analytic height function shared by the mesh and the physics, ocean, runway, lighthouse, pine forest and drifting clouds) and the aircraft are built from code and primitives; three.js is vendored under `game/vendor/` as a minified build.

## Run it

```sh
node serve.ts   # then open http://localhost:8080 in desktop Chrome
```

Or serve the `game/` folder with any static file server and open `game/index.html`. To hand the game in the way the bounty does: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` copies `game/` and `screenshots/` to `out/` and writes the `dossier.json` summary there.

---

<sub>Entered on [make.fun](https://make.fun/?ref=743zv5by&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
