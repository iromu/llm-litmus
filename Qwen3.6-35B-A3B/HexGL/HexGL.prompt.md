Using Three.js and JavaScript, create a futuristic anti-gravity racing game called HexGL. The player pilots a hovering ship through neon-lit sci-fi tracks at high speed.
Core mechanics:

Controls: arrow keys or WASD to steer, accelerate, and brake; ship banks/tilts realistically into turns
Physics-based handling: momentum, drift, and collision response when hitting track walls or obstacles (no rigid stop — bounce/slide based on impact angle)
Speed-based camera FOV widening and motion blur shader to sell the sense of velocity
Boost pads on the track that temporarily increase max speed with a visual shader distortion effect

Track & world:

Generate a track procedurally using a spline-based path (closed loop), with banked turns, tunnels, and elevation changes
Neon-lit low-poly city/canyon environment alongside the track with glowing edges (emissive materials)
Add a skybox or gradient background fitting a synthwave/futuristic aesthetic

Visuals & performance:

Real-time shadows and a post-processing bloom pass for the glowing track edges and ship engine trails
Implement LOD (level of detail) for distant track segments and frustum culling so it runs smoothly (60fps target), even on lower-end devices
Particle trail behind the ship that intensifies with speed/boost

UI/Game flow:

Title screen with a 'Start Race' button
HUD showing speed, lap count, and a countdown timer at race start
Pause menu (ESC) and a results/finish screen showing total race time

Build this as a single self-contained HTML file with embedded JavaScript, using Three.js via CDN. Prioritize a working playable loop first, then layer in shader effects and polish.
