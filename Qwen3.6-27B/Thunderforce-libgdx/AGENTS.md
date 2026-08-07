# AI Agent Guidelines

---

## Subagent Delegation

Always delegate to specialized subagents rather than doing everything yourself. This is the primary productivity
multiplier.

## What to Read First

1. `.wiki/index.md` — wiki with all the knowledge you need to know


---

**Wiki reorganized**: `.wiki/` is structured into `concepts/`, `entities/`, `features/`, `flows/`, `specs/`.

---

## OpenSpec Changes

Active changes in `openspec/changes/`:

Archived changes in `openspec/changes/archive/`.

---

When generating art

You have access to a local ComfyUI MCP server.

1. Translate the request into a precise Mega Drive pixel-art prompt.
2. Prefer strong silhouettes and limited palettes.
3. Avoid photorealism, modern 3D rendering and smooth gradients.
4. Generate the image through the ComfyUI MCP tool.
5. Inspect the generated result.
6. If it does not satisfy the requested style, generate a revised version.
7. Do not claim an image was generated unless the MCP tool succeeded.

## ComfyUI Sprite Generation Workflow

Use the **per-frame generation + assembler** pipeline for multi-frame sprite sheets. Do NOT use ImageGrid nodes — diffusion models cannot map frame indices to individual batch items, producing independent variations rather than coherent animation cycles.

### Pipeline

1. **Generate individual frames** using `generate_player_frames.py`:
   - Each frame gets a unique seed and pose-specific prompt
   - Workflow: `CheckpointLoaderSimple` → `CLIPTextEncode` ×2 → `EmptyLatentImage` (128×128) → `KSampler` → `VAEDecode` → `ImageScale` (24×24, nearest-exact) → `ImageQuantize` (16 colors, bayer-8) → `SaveImage`
   - **Critical**: `SaveImage` node must include `"images": ["8", 0]` input connection, or ComfyUI rejects the workflow
   - Queue via `POST /prompt` with `{"prompt": workflow_json}` envelope, poll `/history/{prompt_id}` for completion

2. **Assemble sprite sheet** using `assemble_sprite_sheet.py`:
   - Loads generated frames, creates RGBA grid with configurable cell_size (32px default), padding (2px default), columns (4 default)
   - Centers each frame within its cell using nearest-neighbor scaling
   - Output: `sprite_sheet.png` in ComfyUI output directory

### Workflow Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Checkpoint | `Genesis.safetensors` | Pixel art model for 16-bit Mega Drive style |
| Latent size | 128×128 | Scales down to 24×24 final |
| Sampler | `dpmpp_2m` | With `karras` scheduler |
| Steps | 28 | Higher for detail |
| CFG | 9 | Strong prompt adherence |
| Quantization | 16 colors, `bayer-8` dither | Bayer-8 ordered dither is more authentic retro than Floyd-steinberg (which creates artifact colors) |
| Cell size | 32×32 | 24×24 sprite + 4px internal padding per cell |
| Columns | 4 | Grid layout for sprite sheet |

### Known Limitations

- **Palette drift**: Frames share ~50–88% of top colors due to independent generation. Acceptable for most assets; for critical animation cycles, consider post-processing to enforce a shared palette.
- **No internal sprite padding**: Diffusion models fill the entire canvas. Sprites touch all edges — the assembler adds padding between cells, but libGDX rendering needs 2px transparent margin around the sprite itself. Post-crop if needed.
- **Frame similarity ~0.59**: Frames are independent variations, not subtle animation steps. For coherent cycles, use img2img with a reference frame or ControlNet conditioning.
- **ComfyUI API format**: Wrap workflow JSON in `{"prompt": workflow}` envelope for POST requests. Raw workflow JSON is rejected with "No prompt provided".

### Output Paths

- ComfyUI output: `/home/wantez/source/github/Confy-Org/ComfyUI/output/`
- Project directory: `/home/wantez/source/github/iromu/llm-litmus/Qwen3.6-27B/Thunderforce-libgdx/`
- Copy generated assets to project `assets/` directory for libGDX use
