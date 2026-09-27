# The Moth Keeper

A one-room point-and-click escape game. Plain HTML/CSS/JS + inline SVG — no build
step, no engine, no external assets. Opens directly from `index.html`.

Autumn, 1899. You wake in a locked attic study. Rain on a round window, a stopped
clock, a locked cabinet, a writing desk with a journal that doesn't say everything
out loud. Every clue you need is already in the room.

```bash
# just open it — no install required
open index.html        # macOS
start index.html        # Windows
```

Click to interact, drag where the game asks for it. Difficulty is tuned to roughly
3/5: fair, but nothing is spelled out for you.

## What's in it

| path | what it does |
|---|---|
| `js/engine.js` | Core engine: view/hotspot registry, inventory, flags, hints, tweening, event bus |
| `js/ui.js` | HUD overlay, title screen, intro dialogue, inventory bar, hint panel, ending card |
| `js/audio.js` | Procedural Web Audio — every sound (clock tick, chime, rain, moth wingbeats) is synthesized at runtime, no audio files |
| `js/art/defs.js`, `js/art/room.js` | SVG defs and the base room art (walls, static decor, ambient light states) |
| `js/modules/clock.js` | Tall clock puzzle (hour/minute hand placement) |
| `js/modules/desk.js` | Desk, journal (4 spreads + moon-ink page), writing box |
| `js/modules/cabinet.js` | Pinned moth specimens + wall-shadow projection puzzle |
| `js/modules/window.js` | Latch, sash swing, moth arrival |
| `js/modules/finale.js` | Cocoon → lamp → ending cutscene |
| `tools/shot.mjs` | Headless Chromium harness (Puppeteer) for scripted playthroughs and screenshots — used for QA, not needed to play |

`DESIGN.md` has the full design bible: premise, puzzle chain, and every solution.
Read it if you're working on the code, not if you want to play the game unspoiled.

## Running the test harness

Optional, only needed if you're changing code:

```bash
npm install
node tools/shot.mjs --view south --flags lampLit --items key --solve 60
```

See the header of `tools/shot.mjs` for the full action-scripting syntax
(click, drag, hover, wait, eval, key).

## Status

All puzzle chains, the intro, and the ending have been through repeated critique-and-fix
passes and pass automated playthrough tests. The one open item is subjective: the
synthesized instrument timbres in `js/audio.js` haven't been judged by a human ear yet.

## Tech

- No dependencies to play. `puppeteer-core` is a devDependency for the QA harness only.
- No build step, no bundler, no framework — classic `<script>` tags, runs from `file://`.
- Responsive layout via CSS container queries (portrait and landscape).
