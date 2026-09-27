# Origin prompts

The instructions used to build and iterate on The Moth Keeper, in order. Kept here
so the creative direction and QA process are traceable, not just the final code.

## Concept

A Rusty Lake–style 2D point-and-click escape room: a single attic room, plain
HTML/CSS/JS + SVG, no build step, playable straight from `index.html`. Built item
by item (clock, cabinet, desk, window, finale, room, audio, UI) using a critic +
builder loop: one pass judges the current state harshly, the next pass fixes
exactly what it flagged, repeated until every item held up.

## Iteration instructions

> Yes, keep grinding on 'Clock, cabinet, and UI' and everything in loop_tracker.md.
> Execute with above system1+2 strategy and loop till the accepted pass rate like
> others. At the end show me all the result. Few things i also want to change
> * Book re-polish - change the font to 'readable' handwriting style, for example
> 'Rastanty Cortez' or any style that looks good. You own the creative direction.
> * The backstory written in the journal sounds odd for me. I want you to challenge
> the logic and loop till it make sense. The tone and wording also too
> 'AI generated'. Doesn't sound like human. Remove '-'
> * Give a more descriptive intro. I feel disconnect or lost about the story in
> this escape room. It should fill in the story and 'goal/purpose' so that player
> understand the story.

> Let's review the escape room game again using a Controlled Serial Sub-Agent
> strategy.
>
> HYBRID EXECUTION RULES:
> 1. CONCURRENCY CAP = 1 — never run more than one background sub-agent at a
>    time; destroy it before starting the next.
> 2. MILESTONE COMPACTION — compact context after each item passes.
>
> STEP 1: BOOK & INTRO FIXES
> 1. Rewrite the journal text across the entire book for period-appropriate tone,
>    eerie atmosphere, and natural grammar — fix clunky phrasing while preserving
>    every puzzle clue (clock hand positions, crescent moon, candle, etc).
> 2. Redesign the page-flip UI: remove the floating bottom-edge arrow controls,
>    replace with dog-ear corner curls flush against the page corners.
> 3. Remove the automatic timer on the intro dialogue; require explicit player
>    input to advance each line.
>
> STEP 2: AUDIT & CONTROLLED GAUNTLET
> Re-inspect the game to be utterly perfect. For each item: spawn one sub-agent
> for a critic pass (Visual Score, Gameplay Score, Pass True/False, one-line
> flaw — nothing else), destroy it immediately. If Pass is False, fix directly
> and re-run the critic. Once Pass is True, compact before moving to the next
> item.
>
> STEP 3: FINAL PLAYTHROUGH PASS
> Simulate a full playthrough as a first-time player. Verify a fair 3/5
> difficulty, smooth and gentle hints, controllable intro pacing, and a
> satisfying finale.

> I noticed the game can 'continue' when i re-visit the page after i close the
> browser when playing halfway. Can you remove the 'continue' feature? Every
> open is a new start.

## Result

`DESIGN.md` is the design bible this process converged on (premise, puzzle
chain, solutions). `loop_tracker.md` (scratch, not committed) recorded every
critic/builder round; every item reached a 9/9 pass except the synthesized
audio timbre, which is flagged as needing a human ear rather than another
agent pass.
