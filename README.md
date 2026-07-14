# Terra Incognita 🧭

*« Here be dragons »*

An exploration adventure game that runs entirely in your browser — no installs, no dependencies.
Open `index.html` and set sail.

The year is 1721. Your ship has landed on the shore of an uncharted continent. Somewhere beyond
the fog lies a **Lost City** of legend — and only three scattered map fragments can reveal it.

## How to play

1. Open `index.html` in any modern browser (or host the folder on GitHub Pages).
2. Pick a world seed (same seed → same world) and start a new expedition.
3. Explore, survive, and find all **3 map fragments** hidden in ruins and temples.
4. Follow the golden compass to the **Lost City** before your supplies run out.

### Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Travel |
| Click a charted tile | Auto-travel there (A* pathfinding) |
| `C` | Camp until morning |
| `M` | Expedition map |
| `H` | Help |
| Mouse wheel | Zoom |

### Survival tips

- Every step burns supplies; forests, swamps, and peaks burn more.
- Forage as you travel — forests are generous.
- **Villages ⛺** fully restock your expedition.
- **Obelisks 🗼** chart the land around them.
- Night narrows your vision and rain slows you down. Camp wisely.

## Features

- Procedurally generated continents from text seeds — every world is guaranteed winnable
  (the Lost City and all three fragments always spawn reachable from your landing site)
- 10 biomes with terrain-based travel costs, fog of war, day/night cycle, and weather
- 25 landmarks per world: villages, ruins, temples, shipwrecks, obelisks, and the Lost City
- Click-to-travel pathfinding, minimap, full expedition map, and a compass endgame
- Foraging, supply management, gold, scoring, and expedition stats
- Autosave — close the tab and continue your expedition later
- Synthesized sound effects (Web Audio, no asset files)

Built with vanilla JavaScript, HTML and CSS. One canvas, zero dependencies.
