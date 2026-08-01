# Pagoda in a Spring Garden — Voxel Art Scene

A single-file, procedurally generated **voxel-art** scene: a 5-tier pagoda set in a spring garden with cherry blossom trees, a pond, a stone arch bridge, lanterns, flowers, and rolling hills.

## Run it

Open **`pagoda.html`** directly in Chrome — no build step, no server required.

```bash
# just open it
open pagoda.html          # macOS
start pagoda.html          # Windows
xdg-open pagoda.html      # Linux
```

Three.js is pulled from a CDN via an `importmap`, so the whole scene lives in one self-contained HTML file.

## Controls

| Action | Effect |
|---|---|
| Drag | Orbit the camera |
| Scroll | Zoom in / out |
| (idle) | Camera auto-orbits the pagoda |

## What's in the scene

- **5-tier pagoda** — stone plaza, tiered wooden walls with golden corner columns, tapering red-orange roofs with **upturned golden eaves**, gold-trimmed windows, a front door, and a golden spire topped with an orb
- **Cherry blossom trees** (pink voxel canopies) and leafy green trees, with fallen **blossom petals** scattered on the grass
- **Pond with a stone arched bridge**, plus rocks around the shoreline
- **Rolling grass hills** (height-varying terrain with dirt layers), a stone **path with glowing lanterns**, scattered colorful **flowers**, and rocks
- **Sky gradient, sun, fog, and floating clouds**, lit by warm directional + hemisphere light with soft shadows

## How it's built

Every voxel is an instanced box:

- A list of `[x, y, z, color]` voxels is assembled **procedurally** — terrain height function, tiered pagoda geometry, tree canopies as jittered spheres, pond/path regions.
- All voxels are packed into a **single `THREE.InstancedMesh`** (~25k boxes, one draw call) with a per-instance color buffer.
- Overlap guards (platform/pagoda floor, spire base, tree trunk/canopy, stairs/path) prevent z-fighting between coincident voxels.
- Lighting uses `HemisphereLight` + `DirectionalLight` (with shadow maps) + a faint ambient, with `ACESFilmicToneMapping` for pleasant color.

## File layout

```
Pagoda/
├── pagoda.html   # the whole scene (single self-contained file)
└── README.md     # this file
```

## Tuning knobs (edit pagoda.html)

- `sides` / `tierY` — pagoda tier widths and heights
- `cherryTrees` / `greenTrees` — tree placement lists
- `HALF` — terrain footprint extent
- `controls.autoRotateSpeed` — camera orbit speed
