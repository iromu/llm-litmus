I want you to build a first-person exploration game set in a dense jungle trail that leads into ancient stone ruins with a waterfall at the end. It should look like a real jungle — not stylized, not low-poly. Think documentary footage: volumetric mist, light filtering through the canopy, wet leaves, moss on stone, the sound of birds and water getting louder as you approach the falls. The player walks a single winding path. Dense canopy at the start, narrowing trail, then it opens into a clearing with crumbling stone ruins overgrown with vines, and a waterfall pouring down a cliff face behind them. No combat, no UI, no HUD. Just movement and atmosphere. Do this in Three.js. Zero external assets. Every texture, every mesh, every sound must be generated procedurally in code.

How to build this: Work on ONE system at a time in this exact order. Do NOT fan out multiple sub-agents in parallel — my machine can't handle it. Build each system sequentially:

Terrain and path geometry
Vegetation (trees, vines, ferns, ground cover)
Lighting and atmosphere (god rays, mist, ambient occlusion)
Stone ruins and temple geometry
Waterfall and water (river, splash particles, wet surfaces)
Sound design (procedural ambient: birds, insects, water, wind)
Post-processing and polish (color grading, depth of field, motion)
For each system: build it, then spawn ONE separate sub-agent as a harsh visual critic. The critic should compare the result against real jungle photography and rate whether it looks photorealistic. If it doesn't, keep iterating on that system before moving to the next one. The critic must never be the same agent that built the thing. It should only see the rendered output, not the code. /loop on each system until the critic says it genuinely looks like a real jungle, not a game. Then move to the next system.

Don't stop until walking this trail feels like watching a nature documentary, not playing a video game.
