# Jungle Trail — Visual Quality Critique

**Date:** 2026-08-03
**Target:** Nature documentary realism (BBC Planet Earth tier). Not a video game.

---

## TERRAIN (`src/terrain/Terrain.ts`)

### Photorealism: 3/10

**What works:**
- FBM noise with ridged overlay gives basic height variation
- Path flattening creates a believable trail corridor
- Vertex color bands by height are conceptually right

**Why it looks like a game:**

- **Heightmap is mathematically synthetic.** The `TerrainNoise` class is value noise with smoothstep interpolation, not Perlin/Simplex. The hash-based approach produces a checkerboard artifact at low frequencies — real terrain has continuous gradients. With `segments=200` over a `size=200` world, each cell is 1m, and the value noise grid cells are visible as faceted planes. A real jungle floor has micro-topography at centimeter scale, not 1m faceted quads.

- **Colors are cartoon jungle.** The height-based color bands are:
  - `height < 0`: `rgb(0.15, 0.18, 0.2)` — grey-blue "river bed"
  - `height < 2`: `rgb(0.12, 0.22, 0.08)` — "dark jungle floor"
  - `height < 8`: `rgb(0.18, 0.28, 0.1)` — "grass and earth"
  - `height >= 8`: `rgb(0.3, 0.28, 0.22)` — "rocky"

  Real jungle soil is `rgb(0.15-0.25, 0.08-0.15, 0.04-0.08)` — warm, dark, organic brown with very low blue. The blue channel in the "river bed" color (`0.2`) makes it look like wet concrete, not river stone. The "grass" band is too green — jungle floor under canopy is almost never this green.

- **The cliff face is a math function, not rock.** `cliffT * 25 + Math.sin(z * 0.5) * 3` creates a smooth sine wave cliff. Real cliffs have vertical fractures, overhangs, talus slopes at the base, and irregular stratification. A single sine wave looks like a stage prop.

- **No normal map.** `geometry.computeVertexNormals()` only computes smooth normals from geometry. There's no bump/normal mapping to add micro-detail. Real terrain photographed at close range shows root balls, leaf litter, small rocks, erosion rills — none of which exist here.

- **Path texture is a canvas with random dots.** The `createPathTexture()` method draws a base color then scatters circles for "dirt variation" and "small stones." This is visibly procedural — the stones are perfect circles, evenly distributed, with no occlusion or depth. Real dirt paths have packed earth texture, hoof/foot impressions, and variation in grain size.

- **The river bed is a flat plane with slight y-offset.** A single `PlaneGeometry(12, 30)` with `Math.sin` undulation is not a river. Real river beds have riffles, pools, exposed gravel bars, and depth variation.

**Concrete fixes:**
1. Replace value noise with simplex noise or a proper Perlin implementation. Add a `getNormal(x, z)` method that samples height at neighboring points for true surface normals instead of `computeVertexNormals()`.
2. Use a proper heightmap texture (loaded from a procedural generation or real data) baked into a `MeshStandardMaterial` with `roughnessMap` and `normalMap` derived from the same height function.
3. Replace color bands with a proper material blend: use a `Mix` node in a custom shader that blends between soil, moss, and rock based on height + slope angle (not just height). Add wetness variation based on proximity to water features.
4. Replace the cliff sine wave with a fractal erosion simulation or at minimum a ridged FBM with vertical asymmetry (steep on one side, gradual on the other).
5. Add a normal map to the path surface using a canvas-generated bump pattern (not just a color texture).

---

## VEGETATION (`src/vegetation/Vegetation.ts`)

### Photorealism: 2/10

**What works:**
- Tree density gradient (denser at start, sparser near ruins) is conceptually good
- Vine placement follows jungle logic
- Ferns with frond count variation is a nice touch

**Why it looks like a game:**

- **Trees are cylinders and icosahedrons.** The trunk is a `CylinderGeometry(0.15, 0.3, height, 8, 4)` — an 8-sided polygon that looks like a pipe. Real tree trunks have bark texture, tapering, branching, and irregular cross-sections. The canopy is a deformed `IcosahedronGeometry` — this looks like a green sphere, not foliage. Real jungle tree canopies are irregular clusters of leaves, not a single blob.

- **No bark texture.** The trunk material is `color: 0x3d2b1f, roughness: 0.95` — a flat brown color. Real bark has vertical ridges, color variation (grey-brown-green from algae/lichen), and micro-detail. A brown cylinder under canopy light looks like a plastic toy.

- **Canopy color is uniform green.** `color: new THREE.Color(0.08 + greenVar, 0.25 + greenVar, 0.06)` — this is a single green with slight variation. Real canopies have:
  - New growth (bright lime green) mixed with mature leaves (dark forest green)
  - Sun leaves (thicker, darker) vs shade leaves (thinner, lighter)
  - Leaf-level specular highlights where light catches individual leaves
  - Variation in hue (yellow-greens, blue-greens, red-tinged new growth)

- **Vines are `TubeGeometry` with radius 0.04.** A 0.04m tube is 4cm thick — that's a tree branch, not a vine. Real hanging vines are 1-3cm diameter and drape with gravity, not hang in a mathematically perfect sine curve.

- **Ferns are flat planes.** The frond blade is a `PlaneGeometry` with a slight curve. Real ferns have:
  - Individual leaflets (pinnae) along each frond, not a single blade
  - Visible midribs
  - Translucency where light passes through (subsurface scattering)
  - Variation in frond orientation (not all radiating from a single point)

- **Ground cover is 500 identical planes.** `InstancedMesh` of `PlaneGeometry(0.15, 0.08)` — every leaf is the same size, same shape. Real leaf litter has hundreds of species, sizes, and orientations.

- **Bushes are deformed icosahedrons.** Same problem as canopies — a blob is not a bush. Real bushes have individual stems, varied leaf clusters, and exposed woody parts.

- **No leaf occlusion or transparency variation.** Leaves are solid `MeshStandardMaterial` — no subsurface scattering, no alpha blending on edges, no variation in leaf color by position on the plant.

**Concrete fixes:**
1. Replace trunk cylinders with `LatheGeometry` profiles that include bark ridges, or use a bark normal map + color map from a texture (even a procedural one with Perlin noise channels).
2. Replace canopy icosahedrons with multiple overlapping leaf clusters using `IcosahedronGeometry` at low detail (radius 0.3-0.5) with varying sizes, colors, and positions. Each cluster should be a different shade of green.
3. Add a leaf-level normal map to canopy meshes so individual leaf surfaces catch light.
4. Replace vine tubes with `TubeGeometry` at radius 0.01-0.02, and add a secondary "leaf vine" with small sphere clusters along the tube.
5. For ferns, create individual pinnae using small planes arranged along a central stem, with translucent materials.
6. Replace ground cover planes with a decal-style approach: a single large plane with a leaf-litter texture map, or use instanced meshes with varied geometry (not just transform).
7. Add `transmission: 0.1` or alpha blending to leaf materials for subsurface scattering effect.

---

## LIGHTING & ATMOSPHERE (`src/lighting/Atmosphere.ts`)

### Photorealism: 4/10

**What works:**
- Hemisphere light (sky/ground gradient) is correct for jungle
- FogExp2 with density 0.018 is reasonable for jungle atmosphere
- God rays concept is right for jungle canopy

**Why it looks like a game:**

- **Sun light is `DirectionalLight(0xffe4b5, 1.2)` with a single shadow-casting source.** Real jungle light is:
  - Highly diffuse — the canopy scatters light so there are no hard shadows
  - Multi-directional — light penetrates through canopy gaps from many angles
  - Color-temperated — direct sun is warm, but canopy-filtered light is green-tinted
  - The single directional light creates uniform shadows that don't match the irregular canopy

- **Shadow map is only 2048x2048 with a 40m camera frustum.** This means each shadow texel covers 2cm of world space. At close range (1-3m from camera), this is acceptable, but the shadow quality drops rapidly at distance. More importantly, the shadow camera only covers `[-20, 20]` in X — the full width of the path area. Anything outside gets no shadows, creating a hard shadow boundary.

- **God rays are `CylinderGeometry` with additive blending.** This is the single most "gamey" element. Real god rays (crepuscular rays) are:
  - Volumetric — they fade gradually through 3D space, not as solid cylinders
  - Irregular in shape — not perfect cylinders with uniform taper
  - Colored by the light source (warm yellow, not white)
  - Visible because of particles in the air (dust, moisture) — they're not independent geometry

  The current implementation renders visible cylinder meshes with `AdditiveBlending`. These look like light sabers, not sunlight through canopy.

- **Mist particles use `NormalBlending` with fixed opacity 0.15.** Real fog is volumetric — it has density that varies with depth, and it scatters light. The current particles are flat sprites with constant alpha.

- **Dust particles use `AdditiveBlending` at 0.3 alpha.** This makes them glow like fireflies. Real dust particles are visible by subtraction (they block light), not by emission. They should use `NormalBlending` or `MultiplyBlending`.

- **Fill light is `DirectionalLight(0x87a86b, 0.3)`.** A green directional fill light is conceptually interesting (bounced canopy light) but in practice creates an unnatural green cast on shadows. Real bounced light in a jungle is more neutral — the canopy absorbs red/blue more than green, but the ground reflects warm tones back up.

- **Point lights are generic.** The "ruin light" (`0xffd4a0`) and "waterfall light" (`0xc0d8f0`) are isolated point sources that create hotspots. Real jungle ruins would be lit by ambient light leaking through canopy gaps, not by a point light at position (0, 4, -70).

**Concrete fixes:**
1. Replace the single `DirectionalLight` with a hemisphere light + a few `RectAreaLight` or `SpotLight` instances positioned at canopy gaps. Use `ShadowMap` with `PCFSoftShadowMap` and a larger shadow camera frustum.
2. Replace god ray cylinders with a post-processing volumetric light shader (screen-space light shafts) or use a custom shader on a large transparent volume that simulates light scattering through particles.
3. Change dust particles from `AdditiveBlending` to `NormalBlending` with lower opacity (0.05-0.1) and larger size.
4. Add a `FogExp2` color that matches the scene fog — currently the fog color is `0x2a3a20` but the mist particles are `0.6, 0.65, 0.55` (grey-green) and the dust is `0.9, 0.85, 0.7` (warm yellow). These should all be consistent.
5. Replace point lights with area lights or use a single `RectAreaLight` for the ruins area.
6. Add a subtle `Bloom` pass that only affects bright areas (sunlit canopy gaps, water sparkle) — not the entire scene.

---

## RUINS (`src/ruins/Ruins.ts`)

### Photorealism: 3/10

**What works:**
- Mix of standing, broken, and missing columns is historically accurate
- Moss patches on stone surfaces is the right idea
- Staircase leading to waterfall makes narrative sense

**Why it looks like a game:**

- **Stone material is a canvas texture with random noise.** The `createStoneMaterial()` method draws a base color, then scatters circles for "variation," then draws grid lines for "block lines." This looks like a Minecraft texture. Real stone has:
  - Stratification (layered sedimentary patterns)
  - Weathering patterns (rounding at edges, pitting)
  - Color variation from mineral deposits (iron staining, lichen growth)
  - Moss and algae in crevices (not flat circles on top)

- **Columns are `CylinderGeometry(0.35, 0.4, height, 12)`.** A 12-sided cylinder is visibly faceted at close range. Real columns have:
  - Fluting (vertical grooves)
  - Erosion at the base (water damage, root intrusion)
  - Color variation (grey at top, green at bottom from moss)
  - Chipped edges and missing chunks

- **The archway is two boxes and a box.** `BoxGeometry(0.6, 5, 0.6)` for pillars, `BoxGeometry(6.6, 0.6, 0.6)` for the arch. These are perfect rectangles with sharp edges. Real stone arches have:
  - Individual voussoirs (wedge-shaped stones)
  - Weathered edges
  - Missing stones creating gaps
  - Vegetation growing between stones

- **Moss is flat `CircleGeometry` at `rotation.x = -Math.PI/2`.** These are green stickers on stone. Real moss:
  - Has volume (it's a carpet, not a flat circle)
  - Grows in irregular patches following moisture patterns
  - Has color variation (dark green in shade, yellow-green in light)
  - Overhangs stone edges

- **No water staining.** Ruins near a waterfall would have extensive water staining — dark streaks running down from the top, mineral deposits, and algae in constantly wet areas. The current ruins look dry.

- **Decorative stones are `DodecahedronGeometry` with noise deformation.** These look like random rocks, not "carved stones." Real carved stones have tool marks, geometric patterns, and inscriptions.

**Concrete fixes:**
1. Replace the canvas stone texture with a proper stone PBR material: diffuse map (weathered stone), normal map (cracks and pitting), roughness map (worn edges vs protected surfaces).
2. Replace column cylinders with `TubeGeometry` that has varying radius along the height, or use a custom geometry with fluting.
3. Add edge wear: use a `MeshStandardMaterial` with `roughnessMap` that makes edges rougher (worn) and flat faces smoother.
4. Replace moss circles with small `SphereGeometry` clusters (deformed) that have volume and hang over edges.
5. Add water streaks to the ruins using a custom shader that darkens the bottom portions of stone surfaces.
6. Add vine growth on ruins by placing vine meshes that start from column tops and drape down.

---

## WATER (`src/water/WaterSystem.ts`)

### Photorealism: 4/10

**What works:**
- Waterfall shader with flow streaks is conceptually right
- Splash particles at the base make sense
- Mist at the waterfall base is atmospheric
- River uses `MeshPhysicalMaterial` with transmission (correct approach)

**Why it looks like a game:**

- **Waterfall is a single plane with sine-wave displacement.** The waterfall geometry is `PlaneGeometry(10, 20, 60, 40)` with `Math.sin(x * 2 + y * 0.5) * 0.15` displacement. Real waterfalls:
  - Have turbulent flow, not sinusoidal patterns
  - Vary in width (narrower at the crest, wider as it falls)
  - Have a white, frothy crest where water breaks
  - Show individual stream separation as water falls
  - Have spray that extends outward, not just downward

  The current waterfall looks like a green curtain with sine waves — not water.

- **Waterfall color is `0.35, 0.55, 0.65`.** This is a teal color. Real waterfall water is:
  - White/transparent at the crest (aerated foam)
  - Blue-green in mid-section (depending on rock type and depth)
  - White again at the base (splash zone)
  - The current shader adds foam only at the top (`smoothstep(0.3, 0.0, vUv.y)`), but the base splash area should be white too.

- **Splash particles are `Points` with `AdditiveBlending`.** These glow like fireflies (same problem as dust). Water splashes should be visible by blocking light (transparent white), not by emitting light.

- **The river is `MeshPhysicalMaterial` with `transmission: 0.6`.** This is actually the right approach for water, but:
  - The river geometry is flat with `Math.sin` ripple — real rivers have depth variation, riffles, and eddies
  - The color `0x1a3a4a` is too dark and uniform
  - No caustics or light patterns on the riverbed

- **Splash velocity attribute is declared but never used in the vertex shader.** The shader references `attribute float velocity` but the vertex shader doesn't use it — it uses `uTime * velocity` in a cycle calculation that doesn't match the actual velocity values.

- **Waterfall mist is `Points` with `NormalBlending` at 0.1 opacity.** This is acceptable but too uniform. Real waterfall mist:
  - Is densest at the base (where water impacts)
  - Drifts outward with wind
  - Has variable thickness creating depth cues

- **Wet surface uses `MeshPhysicalMaterial` with `clearcoat: 0.8`.** This is correct for wet stone, but the geometry is a flat plane. Real wet surfaces have puddles, flowing film, and edge wetting.

**Concrete fixes:**
1. Replace the waterfall plane with a custom shader that simulates turbulent flow using multiple octaves of noise (not just sine waves). Add white foam at the crest and base.
2. Add a secondary "sheet" geometry for the waterfall that represents the white water/foam layer, positioned slightly in front of the main curtain.
3. Change splash particles from `AdditiveBlending` to `NormalBlending` with white color and opacity 0.3-0.5.
4. Fix the splash velocity attribute: either use it in the shader or remove it. The particle reset logic should use a proper cycle based on velocity.
5. Add caustic projection onto the riverbed using a `ShaderMaterial` that projects moving light patterns.
6. Add a noise-based displacement to the river surface that varies in both x and z (not just x).

---

## POST-PROCESSING (`src/post/PostProcessing.ts`)

### Photorealism: 5/10

**What works:**
- ACES Filmic tone mapping (set in Renderer.ts) is the right choice for cinematic look
- Bloom for atmospheric glow is appropriate
- Vignette is subtle and correct

**Why it looks like a game:**

- **Bloom is `UnrealBloomPass(0.4, 0.6, 0.75)`.** Strength 0.4 with threshold 0.75 means only the brightest pixels bloom. In a dark jungle scene, this barely affects anything. Near the waterfall (progress > 0.7), it ramps to 1.0 — which is acceptable but creates a hard transition. Real documentary footage has subtle bloom across the entire frame, not just bright spots.

- **Color grading shader is simplistic.** The fragment shader does:
  ```glsl
  color.r += uTemperature * 0.05;
  color.b += uTemperature * -0.03;
  color.g += uTint * 0.08;
  ```
  This is a flat RGB shift, not a proper color grade. Real cinematic color grading:
  - Uses 3D LUTs (lookup tables) for per-channel non-linear adjustments
  - Has separate shadow/midtone/highlight curves
  - Applies color shifts based on luminance (shadows go warm, highlights go cool)
  - Has film emulation (contrast roll-off, saturation curves)

- **Film grain is `fract(sin(dot(...))) * 0.02`.** This is a standard hash-based grain, but:
  - It's uniform across the frame (real grain is finer at high ISO, coarser at low)
  - It's per-pixel (real grain is spatially coherent — it's a film texture)
  - At 0.02 intensity, it's barely visible and looks like digital noise

- **FXAA is used instead of TAA.** FXAA is a post-process anti-aliasing pass that blurs edges. It works but:
  - It blurs fine detail (vines, fern fronds, grass)
  - It creates a slight "soap opera" effect
  - Real cameras have motion blur and temporal accumulation — TAA (Temporal Anti-Aliasing) is more film-like

- **No filmic roll-off.** The tone mapping in the shader is `color.rgb / (color.rgb + 0.8)` which is a simple linear-to-curve mapping. Real ACES Filmic has a specific S-curve that preserves highlights better.

- **Progress-based color grading is too obvious.** As the player moves from dense jungle (progress 0) to waterfall (progress 1), the color grading shifts from "warm/dark" to "cooler/brighter." This transition is too smooth and too large — it creates a visible "corridor" effect where the environment changes color as you walk.

**Concrete fixes:**
1. Replace the custom color grading shader with a proper `ColorCorrectionPass` or a 3D LUT-based approach. Use separate shadow/midtone/highlight adjustments.
2. Increase bloom to a subtler `UnrealBloomPass(0.15, 0.8, 0.9)` that affects the entire scene uniformly, not just bright spots.
3. Replace FXAA with TAA (Temporal Anti-Aliasing) for a more cinematic look. This requires rendering at a lower resolution and accumulating over time.
4. Add motion blur using a `ShaderPass` that blurs along the camera velocity vector. This is essential for the "documentary" feel — real cameras have motion blur.
5. Replace the film grain with a pre-generated grain texture (1-2KB PNG) that's sampled and offset over time, creating spatially coherent grain.
6. Make the progress-based color grading much subtler (max 5% shift) or remove it entirely — let the scene lighting handle the variation.

---

## OVERALL ASSESSMENT

### Aggregate Photorealism: 3.5/10

This is a competent Three.js demo. It is not a nature documentary. The gap between "game demo" and "documentary" is not a matter of tweaking parameters — it requires fundamental changes to the rendering approach.

**The core problems are:**

1. **Geometry is too simple.** Cylinders, boxes, and icosahedrons are not how nature works. Real jungle geometry is fractal, irregular, and multi-scale. Every object needs micro-detail (bark texture, leaf veins, stone pitting) that the current code lacks entirely.

2. **Materials are flat.** `MeshStandardMaterial` with a single color and roughness is the baseline. Real materials have PBR maps (diffuse, normal, roughness, metalness, clearcoat, transmission, sheen) and subsurface scattering for organic matter.

3. **Lighting is game-like.** Single directional light with hard shadows, additive-blended god rays, and point light hotspots create a video game aesthetic. Real jungle lighting is diffuse, multi-directional, and color-tempered by the canopy.

4. **Post-processing is incomplete.** The current pipeline applies basic bloom and a simple color shift. A documentary look requires ACES Filmic tone mapping, TAA, motion blur, film grain, and proper color grading with 3D LUTs.

5. **No texture streaming.** Everything is procedural (canvas textures, simple noise). A documentary-quality scene needs high-resolution texture maps (4K+ diffuse, normal, roughness maps) for terrain, vegetation, and ruins.

**Priority order for improvement:**
1. **Lighting** (highest impact, lowest effort) — Replace single directional light with multi-source canopy lighting
2. **Vegetation** (highest impact, highest effort) — Replace primitive geometry with leaf-level detail
3. **Post-processing** (medium impact, medium effort) — Add motion blur, TAA, proper color grading
4. **Water** (medium impact, medium effort) — Replace sine waves with turbulent flow shader
5. **Terrain** (medium impact, high effort) — Add normal maps, proper material blending
6. **Ruins** (low impact, medium effort) — Add weathering, water staining, vine growth
