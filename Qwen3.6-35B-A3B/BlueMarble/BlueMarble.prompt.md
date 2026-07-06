Create a single self-contained HTML file (no build step, runs by opening
directly in a browser) that renders a photorealistic real-time Earth
simulation using Three.js (ES modules from a CDN like unpkg or jsdelivr,
with an import map — no bundler).

EARTH SPHERE
- High-poly sphere (64+ width/height segments), custom ShaderMaterial
  (not MeshPhongMaterial) so day/night blending is fully controlled.
- Texture maps: diffuse/day map, night-lights map (city lights), normal
  map for terrain relief, and a specular/ocean mask (so specular
  highlights only appear on water, not land).
- In the fragment shader, blend day and night textures based on
  dot(normal, sunDirection): night lights fade in smoothly across the
  terminator, not a hard cutoff.
- Apply a moving specular highlight (Blinn-Phong is fine) masked by the
  ocean map, reacting to sun direction and camera angle.
- Source real public-domain/CC textures (NASA Blue Marble or Solar
  System Scope's earth texture set are good options). If a texture URL
  isn't reachable, generate a reasonable procedural canvas-based
  fallback so the demo never renders a black/broken sphere.

CLOUDS
- Separate sphere ~1.005x Earth's radius, alpha-mapped cloud texture,
  rendered with alpha blending, depth write off where transparent.
- Rotates independently and slightly faster than the surface (clouds
  drift relative to the ground).
- Subtly darkens the surface beneath dense cloud cover (cheap fake
  shadow is fine — doesn't need real shadow mapping).

ATMOSPHERE — RAYLEIGH SCATTERING
- A third, larger transparent shell sphere rendered with BackSide,
  additive blending, depth write off.
- Custom GLSL shader implementing a fresnel/view-angle-based glow:
  intensity ∝ pow(1.0 - dot(normal, viewDir), exponent), with color
  shifting from deep blue (Rayleigh, short wavelengths scatter more)
  at the limb toward a faint warm tint near full grazing angle (Mie-ish
  forward scattering near the sun side).
- If you're able to go further: implement a proper single-scattering
  approximation (ray-march or analytic optical-depth integral à la
  Sean O'Neil's GPU Gems 2 technique) with wavelength-dependent
  scattering coefficients for R/G/B and a sun-side haze brightening.
  Otherwise the fresnel approximation above is an acceptable fallback
  — prioritize it looking convincing over being physically exact.

LIGHTING & MOTION
- One distant "sun": a bright emissive sphere + a directional light
  pointing from it toward Earth. Optional additive sprite/glow billboard
  for a lens-flare-ish bloom around it.
- Earth rotates on a 23.5° axial tilt, using delta-time (THREE.Clock)
  so rotation speed is frame-rate independent, not arbitrary speeds.
- Subtle starfield background (procedural THREE.Points, random
  positions on a large sphere, varied size/brightness — no flat
  skybox texture).

CAMERA / RENDERER
- OrbitControls (damped), reasonable zoom min/max so you can't clip
  into the planet or zoom out to nothing.
- ACESFilmicToneMapping, correct sRGB output color space, antialiasing
  on, responsive to window resize.
- Optional: lightweight UnrealBloomPass on the sun for an extra glow,
  but keep it cheap — don't tank framerate.

OUTPUT
Output ONLY the complete HTML file contents, fully commented, ready to
save and open directly. No explanation before or after the code block.
