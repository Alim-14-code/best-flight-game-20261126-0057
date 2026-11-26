# Merapi Mail Run

[![competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Alim-14-code/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Alim-14-code/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A bush-pilot mail run across an Indonesian archipelago — an entry for make.fun's Make the best flight game bounty ($500, top 50 paid). Fly the mail plane through eight glowing rings over sea, hills and a smoking volcano, then put her down gently on the far island's runway. Fuel is limited, the rings top it up, and a hard landing is a crash.

## How to fly

- **Arrow keys / A D** — bank and turn; **Arrow Up / Down / W S** — pitch
- **W / S** also nudge the throttle (Shift / Ctrl work too); **mouse held down** steers by pointer
- **Space / click** — take off and restart; **P** — pause; **R** — restart; **M** — mute

The HUD shows altitude, speed, heading, vertical speed, throttle and fuel, a live attitude
indicator and compass tape, and the distance to the next ring. Fly a ring dead centre for a
bonus; every ring adds fuel. Land inside the strip, slower than 125 kt and sinking slower than
9 ft/s, and the mail is delivered.

## How it works

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and
writes `/output/dossier.json` with the vendored `buildDossier` library. The game is plain static
files — `game/index.html` and ES modules, no library, no network request — with procedural
WebAudio sound and a seeded world, so `?seed=N` replays the same run and `?shot=start|play|
approach|end` stages the screenshot scenes.
