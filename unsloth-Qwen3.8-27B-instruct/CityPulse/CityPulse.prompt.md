Using Three.js and JavaScript, create an Elder Scrolls-style open-world city exploration game — a small medieval/fantasy town the player can freely walk through and interact with, in the spirit of an Oblivion or Skyrim city hub.
World & city design:

Build a detailed medieval-fantasy city with varied architecture: stone buildings, wooden market stalls, a town square, cobblestone paths, walls/gates, and at least one notable landmark (e.g. a keep, temple, or tavern)
Add environmental details: torches/lanterns with flickering point lights, banners, crates, barrels, fences, and foliage to make the city feel lived-in
Include a day/sky backdrop (skybox or gradient) with basic ambient lighting that evokes a fantasy atmosphere

Character & controls:

Player controls a third-person character using WASD for movement (with run animation/state) and SPACE to jump
Character should rotate to face movement direction, with basic gravity so they don't float off ledges
Orbit camera around the character (mouse drag or right-click drag) with scroll-to-zoom in/out
Camera must collide with buildings/geometry — no clipping through walls; camera should pull in closer when obstructed

NPCs & interaction:

Populate the city with at least 3-5 NPCs (townsfolk, a merchant, a guard) using simple humanoid models, each with idle animations or basic patrol/wander behavior
Walking near an NPC and pressing an interact key (e.g. E) should trigger a dialogue box with flavor text or a simple branching conversation (Elder Scrolls-style dialogue UI: portrait + text + response options)
At least one NPC should offer a small fetch quest or piece of lore to give the world a sense of purpose

UI & game flow:

Main title screen with game name, a parchment/fantasy-styled font and background, and a 'Begin Adventure' button
Pause menu triggered by ESC, with Resume/Settings/Quit options, styled to match the fantasy aesthetic
A minimal HUD: compass or location name at the top, and a subtle prompt ('Press E to talk') when near an interactable NPC

Build this as a single self-contained HTML file with embedded JavaScript, using Three.js via CDN. Prioritize a fully working movement + camera + interaction loop first, then layer in environmental detail, NPC dialogue depth, and UI polish to capture that immersive Elder Scrolls city feel.
