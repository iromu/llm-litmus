Using HTML, CSS, and JavaScript (Canvas or SVG, no external game engine), design a simple turn-based strategy base-building game in the style of Civilization, rendered with clean 2D shapes.
World & map:

Generate a hex-grid world (e.g. 15x15 or larger) using axial or offset coordinates
Procedurally assign terrain types per hex: grassland, forest, mountains, water, desert — each with a distinct color/shape pattern and a simple movement-cost/yield value (food, production, gold)
Render hexes with subtle shading or icons to indicate terrain and resources, plus a fog-of-war/unexplored overlay that clears as units explore

Civilization & units:

Player starts with one Settler and one Warrior unit; allow founding a city by moving the Settler onto a hex and clicking 'Found City'
Design at least 3-4 unit types (e.g. Settler, Warrior, Archer, Worker) as simple geometric icons, each with movement range, attack/defense stats, and unique abilities (Workers improve terrain, Settlers found cities)
Implement basic combat: when units from different civilizations occupy adjacent hexes, allow attack resolution using simple stat comparison + minor randomness

Cities & production:

Each founded city has a build queue (units or buildings) and accumulates production/turn based on worked surrounding hexes
Add 2-3 building types (e.g. Granary, Barracks, Marketplace) that modify city yields
Track and display per-city and per-civilization totals: population, gold, science

Turn structure:

Implement an end-turn button that resolves AI civilization moves (at least one simple AI opponent that expands, builds units, and can attack), processes city production, and advances unit movement allowances
Add a basic tech/progress system — even a simple linear tree with 4-6 techs that unlock new units or buildings over time

UI/UX:

Sidebar or bottom panel showing selected unit/city info and available actions
Minimap or zoom/pan controls for navigating the hex world
Turn counter and a clean main menu/title screen to start a new game
Polish the visual style with a cohesive color palette (e.g. muted earth tones for terrain, clear icon-based unit silhouettes) so it feels intentional rather than placeholder

Build this as a single self-contained HTML file with embedded JavaScript. Prioritize a fully working turn loop (move, build, attack, end turn) first, then layer in tech progression, AI behavior, and visual polish.
