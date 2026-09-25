# THE MOTH KEEPER — Design Bible

*A one-room point-and-click escape game. Plain HTML/CSS/JS + SVG. No build step; opens from `index.html` via file://.*

## Premise
Autumn, 1899. The attic study of **Edith Vane**, lepidopterist, daughter of a clockmaker. Rain on the round window.
The player wakes inside. The door has no handle — only a brass plate shaped like a moth, its wings hollow.
Edith's journal hints that she has been "becoming" something. She stopped the tall clock at the minute
*she* (the great moth) first came to the window.

**The twist / finale:** Inside Edith's writing box is a cocoon and a letter: *"I have gone where the lamps are. I left
one behind for you. Keep her warm — they always wake to warmth."* Warmed at the lamp, the cocoon splits and a
luminous pale-green luna moth unfolds, circles the lamp, flies to the door and settles into the hollow plate — its wings
complete the brass moth. The mechanism turns; the door swings open onto a moonlit night full of drifting moths.
Final card: *"She never left. She was only waiting for someone to light the lamp."*

Tone: melancholy, tender, a little uncanny (Rusty Lake / Cube Escape adjacent), but never gory.

## Puzzle chain (difficulty 3/5) — every clue is in the room
| # | Puzzle | Where | Needs | Clue | Solution | Reward |
|---|--------|-------|-------|------|----------|--------|
| 0 | Read journal | South desk | — | — | — | clues |
| 1 | **Tall clock** | North, left of door | — | Journal p1: "short hand on the crescent moon, long hand on the candle" + 12 picture-icons on the dial | Hour hand → crescent (8 o'clock pos), minute hand → candle (3 o'clock pos) | pendulum door opens → **matches** |
| 2 | **Oil lamp** | South desk | matches | obvious | use matches on lamp | lamp lit: room turns warm; shade casts **4 moth silhouettes** on the wall above the desk |
| 3 | **Cabinet drawer** | East | projection | Journal p2: "I count their eyes — every eye on every wing" + 6 pinned moths with distinct silhouettes & eyespots | Projection L→R: Atlas(8) Luna(4) Hawk(2) Emperor(6) → **8426** | **brass key** |
| 4 | **Window latch** | West | brass key | small brass keyhole on latch | use key on latch | window opens: wind, louder rain, moonlight shaft across the desk |
| 5 | **Moon ink** | South desk / journal | window open | Journal p3 blank: "Some words I write only for the moon." | re-read journal in moonlight → p3 shows 4 moons: new, first quarter, full, last quarter | code for box |
| 6 | **Writing box** | South desk | moon ink | 4 moon-phase dials | 🌑 🌓 🌕 🌗 | **cocoon** + **letter** |
| 7 | **Hatching** | South desk | cocoon, lamp lit | letter: "they always wake to warmth" | use cocoon on lit lamp | **finale cutscene** → door opens |

### Moths in the cabinet (2 rows × 3). Eyes = concentric ringed eyespots with a pupil; nothing else looks like an eye.
| slot | name (label) | silhouette | eyes (total) |
|---|---|---|---|
| A | *Attacus atlas* | broad, hooked/sickle forewing tips | **8** (2 on each of 4 wings) |
| B | *Actias luna* | pale green, long trailing hindwing tails | **4** (1 per wing) |
| C | *Sphinx ligustri* (hawk-moth) | narrow swept-back jet wings, long body | **2** (1 per hindwing) |
| D | *Saturnia pavonia* (emperor) | round, fan-like wings | **6** (forewings 1 each, hindwings 2 each) |
| E | *Automeris io* (decoy) | rounded, yellow | **2** (1 huge eye per hindwing) |
| F | *Pterophorus* plume moth (decoy) | thin T-shape, feathery | **0** |
Projection (L→R): **A B C D** → drawer code **8 4 2 6**. Decoys never appear in the projection.

### Clock dial icons (clockwise from 12): 12 sun · 1 bee · 2 rose · 3 **candle** · 4 key · 5 feather · 6 full moon · 7 bell · 8 **crescent moon** · 9 star · 10 hourglass · 11 snail
Solution: hour hand at 8 (crescent), minute hand at 3 (candle) = 8:15.

### Journal (4 spreads)
1. "14th October. They took Father to the asylum today. I keep his clocks wound for him — all but the tall one. That one I stopped at the very minute *she* first came to my window: the short hand upon the crescent moon, the long hand upon the candle."
2. "Father cut my lampshade by hand, so the lamp throws my four dearest onto the wall. When I count them, I count their eyes — every eye, on every wing."
3. (blank, faint shimmer) "…" — tiny line at the bottom: "Some words I write only for the moon." → after window open: 4 moon glyphs + "for the box" appear in silvery ink.
4. "They are calling me now, every night, at the glass. I think I am ready to go."

## Hint system
Hint button (a small moth/lantern icon). Picks the first **available & unsolved** puzzle in chain order.
Each press escalates: nudge → stronger nudge → explicit answer (the answer only on the 3rd ask, with a "Show me the answer?" confirmation). Levels are remembered per puzzle.

## Art bible — "hand-inked naturalist plate by candlelight"
- Flat illustrated shapes with soft painterly gradients; **ink outlines** `#1c140f`, 2–3px, `stroke-linejoin:round; stroke-linecap:round`.
- Use the shared filter `url(#ink)` (subtle wobble) on line art; `url(#paper)` texture; `url(#softshadow)`; `url(#glow)`.
- Whole stage gets a paper-grain overlay + dark vignette (done by room/UI).
- **Palette** (use these, tints/shades OK):
  - night `#0e171b` · deep teal `#16262b` · wallpaper sage `#3e4b3c` / `#56634f` · damask `#4b5a47`
  - walnut `#3a2418` / `#5a3824` / `#7a4e30` · oxblood `#5e2322`
  - brass `#b8893a` / hi `#e7c476` / lo `#6e4d1c`
  - candle `#ffcf7a` / flame `#fff1c1` / ember `#e0853a`
  - moth-pale `#e9e0c4` · luna green `#a8d8b0` / `#6fae8a` · moonlight `#cfe3ff` / `#8fb3d9`
  - dusty rose `#a35a5a` · ink `#1c140f` · paper `#e8dcc0` / `#d8c8a4`
- **Lighting states** (flags): before `lampLit` the room is moonlit-cold (blue-teal, low contrast, deep shadows).
  After `lampLit`, warm amber pool around the desk (south) with bleed into other walls. After `windowOpen`,
  a cold moonbeam from the west window.
- Fonts: `"IM Fell English", "Cormorant Garamond", Georgia, serif` (loaded from Google Fonts, graceful fallback). Handwriting: `"Homemade Apple", "IM Fell English", cursive` for Edith's journal.
- Motion: slow, weighted, eased (no bouncy UI). Dust motes, flame flicker, rain streaks, candle-glow breathing.

## Stage & layout contract (SVG viewBox `0 0 1600 900`)
Floor line ≈ y 790. Reserved object zones per wall (room art must leave these clear / provide a suitable backdrop):
- **north** — door frame x 640–960, y 150–800 (owned by finale module). Tall clock x 300–500, y 110–800 (clock module). Rest: room art decor.
- **east** — cabinet x 480–1120, y 140–790 (cabinet module).
- **south** — desk x 380–1220, top at y 575 (room art draws the desk). Lamp centred x 900, base y 575, top ≈ y 360 (desk module). Journal on desk x 520–720 (desk module). Writing box x 1010–1170 (finale module). Projection area on wall x 440–1160, y 110–340 (desk module). Portrait of Edith on wall x 1260–1470, y 150–430 (room art).
- **west** — round window centre (800, 360) r 230 (window module draws window, frame, latch, sky, rain outside, moonbeam). Below sill y ≥ 610: room art (window seat, plants).

## Engine API (js/engine.js → `window.G`)
See comments at the top of `js/engine.js`. Key points:
- `G.registerWallBase(wall, {build(g), update()})` — room art per wall.
- `G.registerWallObject(wall, {z, build(g), update()})` — objects placed on a wall.
- `G.registerView(id, {parent, build(g), update(), enter(), exit()})` — close-ups; `parent` = view to return to.
- `G.hotspot(elem, {click, use(itemId)→true|false, cursor:'look'|'use'|'take'})`.
- `G.set/get` flags, `G.give/take/has` items, `G.registerItem`, `G.say(text)`, `G.sfx(name)`, `G.busy(bool)`.
- `G.registerHint({id, order, when, lines:[nudge, stronger, answer]})`, `G.registerStep(order, name, fn)` for debug solving.
- `G.tween(ms, fn(t), ease)` → Promise, `G.wait(ms)`, `G.toStage(evt)`.

## Canonical flags
`journalRead, clockSolved, gotMatches, lampLit, drawerOpen, gotKey, windowOpen, inkSeen, boxOpen, gotCocoon, letterRead, hatched, doorOpen, finished`

## Canonical items
`matches, key (brass key), cocoon, letter`

## SFX names (js/audio.js → `Audio.play(name)` via `G.sfx`)
`click, step, pickup, tick, chime, clockOpen, match, lampWhoosh, drawerOpen, lockClick, lockFail, dial, keyTurn, windowCreak, wind, paper, pageTurn, boxOpen, cocoonCrack, mothFlutter, magic, doorUnlock, doorOpen, success, hint, back`
Ambient scenes driven by flags (rain louder when windowOpen, warm hum when lampLit, finale music).

## Testing
`node tools/shot.mjs --help` — headless Chrome screenshots with state set via the debug API.
URL params: `?debug=1&skip=1` (skip title) `&view=south&flags=lampLit,windowOpen&items=matches,key`.
