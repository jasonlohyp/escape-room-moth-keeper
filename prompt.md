# The prompt

This is the entire prompt that produced this repository.

```
I want you to build a 2D escape room game at the level of the best-loved escape games, like the Rusty Lake and Cube Escape series. It should be utterly perfect, visually beautiful and genuinely fun, with every single thing done at the highest quality, from the room, art and atmosphere to the puzzles, sound and the moment the door finally opens.

You own the creative direction. Invent the theme, the story, the puzzles and the art style. Surprise me. Make it a 2D point-and-click game with a strong, hand-crafted illustrated look.

Keep it simple and fair: one room, a handful of linked puzzles, difficulty 3 out of 5. Every clue must be in the room. Include a hint system that gently nudges first and only gives the answer if the player keeps asking.

Fan out sub-agents and have sub-agents tackle each one individually so that the game is utterly perfect. You should /loop on each item and have a separate sub-agent check it visually and by actually playing it. That separate sub-agent should be a really harsh critic, and if it doesn't look and feel like a top-tier escape game, it should keep going.

Have another sub-agent play the full game start to finish as a first-time player. If any puzzle is unfair, confusing, too easy or too hard for a 3 out of 5, send it back.

Each item gets at most 5 rounds with the critic. If it is still not there, move on and list it in a final "what I'd improve next" note.

Don't stop until each sub-agent is utterly wowed with the quality when compared with the best escape room games out there. It should literally compare them side by side blind and say which one looks and plays better. Do this in plain HTML, CSS and JavaScript with SVG or Canvas, no 3D. /loop until it's utterly perfect. Fan out sub-agents and ultracode.
```