# TERRA INCOGNITA

*you wake up in a field.*

A text-based RPG in the browser. Monospace, ASCII, dark. No frameworks, no dependencies,
no build step — open `index.html` and play.

You wake with no memory near a cabin that has clearly been lived in — by someone with your
handwriting, your boot size, your habits. Journals that stop mid-sentence. Tea that is still
warm. Six landmarks wait out in the fog of an unfamiliar land, and each one guards a piece
of a machine that wants to be built.

## Playing

Open `index.html` in any modern browser (or host the folder on GitHub Pages).

| key | action |
| --- | --- |
| WASD / arrows | move · navigate menus |
| Enter | select |
| 1–9 | quick-select menu options |
| I | open your pack |
| Esc | back / leave |
| S (title screen) | toggle sound |

- Explore the overworld to find the six areas. The fog only lifts where you walk.
- Each area holds two lesser creatures, a boss, a hidden item, and something worth remembering.
- Beat the boss to recover a machine piece; bring pieces back to the cabin shelf.
- Rest at the cot, craft at the workbench, and read the journals — they contain practical
  hints, and other things.
- Turn-based combat: `[ attack ] [ dodge ] [ use item ] [ flee ]`. Watch enemy patterns;
  dodging a telegraphed blow opens them up. Fleeing never works on bosses.
- If you die, you wake on the cot at half health. This will feel familiar. That's the point.
- The game autosaves. Close the tab and continue later.

## Structure

```
index.html
style.css
js/
  main.js        core: state, log, menus, sound, saves
  overworld.js   the 13x7 overworld
  cabin.js       cot, workbench, machine shelf, journals, chest, the ending
  combat.js      turn-based combat engine
  inventory.js   6-slot pack, equipment, crafting
  memory.js      memory fragment system
  area.js        area engine
  areas/         swamp, castle, forest, cliff, ruins, cave
  data/          items, creatures, memories
```

Vanilla HTML/CSS/JS. Everything is data-driven: new areas, creatures, items, and recipes
are added by editing the files in `js/data/` and `js/areas/`.
