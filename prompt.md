# The prompts

This repo was built in two passes: an initial open-ended prompt, then a second prompt that changed *how* the work got done after the first approach burned through a lot of usage credits.

## Prompt #1 — the fan-out gauntlet-loop

Fan-out sub-agents (many background agents working in parallel, each on its own item) was the original execution strategy: build every item, then fan out one sub-agent per item to critique and fix it, looping each until it passed.

```
I want you to build a 2D escape room game at the level of the best-loved escape games, like the Rusty Lake and Cube Escape series. It should be utterly perfect, visually beautiful and genuinely fun, with every single thing done at the highest quality, from the room, art and atmosphere to the puzzles, sound and the moment the door finally opens.

You own the creative direction. Invent the theme, the story, the puzzles and the art style. Surprise me. Make it a 2D point-and-click game with a strong, hand-crafted illustrated look.

Keep it simple and fair: one room, a handful of linked puzzles, difficulty 3 out of 5. Every clue must be in the room. Include a hint system that gently nudges first and only gives the answer if the player keeps asking.

Fan out sub-agents and have sub-agents tackle each one individually so that the game is utterly perfect. You should /loop on each item and have a separate sub-agent check it visually and by actually playing it. That separate sub-agent should be a really harsh critic, and if it doesn't look and feel like a top-tier escape game, it should keep going.

Have another sub-agent play the full game start to finish as a first-time player. If any puzzle is unfair, confusing, too easy or too hard for a 3 out of 5, send it back.

Each item gets at most 5 rounds with the critic. If it is still not there, move on and list it in a final "what I'd improve next" note.

Don't stop until each sub-agent is utterly wowed with the quality when compared with the best escape room games out there. It should literally compare them side by side blind and say which one looks and plays better. Do this in plain HTML, CSS and JavaScript with SVG or Canvas, no 3D. /loop until it's utterly perfect. Fan out sub-agents and ultracode.
```

## Why the strategy changed

Prompt #1's fan-out — many parallel background sub-agents, each with its own context — worked, but burned through a large amount of usage credits fast. Every parallel agent re-pays the cost of re-establishing context, and several were running at once. Prompt #2 replaces fan-out with a **System 1 + System 2 loop** run one agent at a time in strict sequence:

- **System 1 (critic)** — a single short-lived sub-agent per item, given one job: score it and say pass/fail in four lines, nothing more. It's disposable - spawned, judges, destroyed.
- **System 2 (builder)** — the main thread. It reads the critic's verdict and either fixes the flaw directly or moves on if the item passed.
- **Concurrency cap of 1** — never more than one sub-agent alive at a time, so cost stays linear (one critique at a time) instead of multiplying across parallel agents that each carry their own context.
- **Compaction between items** — condensing the conversation after each item passes keeps the main thread's context (and therefore cost) from growing across the whole gauntlet. `/compact` is a command only the user can run, so the main thread's job is to call out the moment an item passes and hand compaction back to the user, rather than assume it can trigger it itself.

## Prompt #2 — the controlled loop

```
Let's review the escape room game again using a Controlled Serial Sub-Agent strategy.

HYBRID EXECUTION RULES:
1. CONCURRENCY CAP = 1 — never have more than one sub-agent alive at a time. Finish and discard the current sub-agent completely before starting the next one.
2. MILESTONE CHECKPOINTS — the moment any item reaches Pass: True, stop and tell me so I can run /compact myself before we start the next item. Don't assume you can trigger compaction, flag it and wait.

STEP 1: AUDIT & CONTROLLED GAUNTLET
1. Re-inspect the game so it is utterly perfect.
2. Process each remaining item sequentially, one at a time, in this single thread:
   - Critic pass: spawn exactly one sub-agent to judge the item's visual quality and gameplay by actually exercising it. It must return only four lines — Visual Score, Gameplay Score, Pass: True/False, and a ten-word flaw — then it is destroyed immediately.
   - Builder pass: if Pass is False, fix the flaw directly in the main thread (no sub-agent) and re-run the critic pass.
   - Once Pass is True: flag it as a milestone checkpoint per the rule above, then move to the next item.

STEP 2: FINAL PLAYTHROUGH PASS
Once every item has passed, simulate a full playthrough as a first-time player. Verify fair 3/5 puzzle difficulty, smooth and gentle hints, controllable intro text pacing, and a satisfying finale landing.
```

## Result

Every item (clock, cabinet, desk, window, finale, room, audio, UI) reached a 9/9 critic pass under this loop except the synthesized audio timbre, which is a subjective call flagged for a human ear rather than pushed through more rounds.

See `README.md` for the current status and `DESIGN.md` for the full puzzle design.
