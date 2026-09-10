# llm-litmus

A controlled benchmark for evaluating how well large language models generate complex, single-file HTML/JS applications from a single prompt.

## Methodology

Each model receives the **same prompt** for a given test scenario. The prompt may include injected [Three.js skills](https://github.com/cloudai-x/threejs-skills) to level the playing field across models with different knowledge cutoff dates. Skill variants of a test run the identical prompt with the full skill pack symlinked into the test directory under `.agents/skills/` (e.g. `JungleTrail` vs `JungleTrail-skills`).

Exact skill revisions are hash-pinned in [`skills-lock.json`](skills-lock.json) and symlinked into place by [`link-skills.sh`](link-skills.sh). Skill sources:

- `cloudai-x/threejs-skills` — core Three.js API skills (fundamentals, materials, lighting, shaders, …)
- `majidmanzarpour/threejs-game-skills` — game-director, AAA graphics, gameplay systems, UI, QA/profile, 3D/image/audio generators
- `dgreenheck/webgpu-claude-skill` — WebGPU + TSL

The generated HTML output is evaluated for:
- **Correctness** — does the app run without errors?
- **Feature completeness** — are all required features present?
- **Bug fix iterations** — how many autocorrect cycles were needed when the initial output was broken? Error logs are passed back to the model "as is" for each iteration.

## Models tested

| Model | Tests run |
|---|---|
| [deepseek-v4-flash](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash) | CityPulse, HexGL, Sol, Tetris |
| DeepSeek-V4-Flash-0731 | Pagoda |
| NVIDIA-Nemotron-3.5-Lightning-30B-A3B | Pagoda |
| Qwen3.5-122B-A10B | Pagoda |
| [Qwen3.6-27B](https://qwenlm.github.io/blog/qwen3.6/) | 100-HTML, CityPulse, JungleTrail, Pagoda, Sol, Tetris |
| [Qwen3.6-35B-A3B](https://qwenlm.github.io/blog/qwen3.6/) | BlueMarble, CityPulse, HexConquest, HexGL†, JungleTrail-skills, Pagoda, Sol, Tetris, Thunderforce |
| Qwen3.8-Flash-Next | Pagoda |
| unsloth-Qwen3.8-27B-instruct | 100-HTML, CityPulse, JungleTrail†, JungleTrail-skills†, Pagoda, Sol†, Tetris |
| unsloth-Qwen3.8-27B-thinking | 100-HTML, Pagoda; CityPulse†, JungleTrail†, JungleTrail-skills†, Sol†, Tetris† |

> `†` = prompt prepared, no output generated (yet).

## Test scenarios

| Test | Description | Tech stack |
|---|---|---|
| **CityPulse** | Elder Scrolls-style open-world city exploration with third-person character, NPC dialogue, and fetch quests. | Three.js |
| **BlueMarble** | Photorealistic real-time Earth simulation with day/night blending, cloud layer, Rayleigh atmosphere, and axial tilt. | Three.js |
| **HexGL** | Futuristic anti-gravity racing with procedural tracks, physics-based drift, bloom post-processing, and particle trails. | Three.js |
| **Sol** | Interactive 3D solar system with proportional orbit speeds, hover tooltips, and speed controls. | Three.js |
| **Tetris** | Classic Tetris with particle effects and neon visuals. | Vanilla JS + Canvas |
| **Pagoda** | Voxel art scene of a pagoda in a garden with cherry blossom trees. | Three.js |
| **HexConquest** | Turn-based hex-grid strategy (Civilization-lite) with terrain, fog of war, AI opponent, and a tech tree. | Vanilla JS + Canvas |
| **JungleTrail** | Photorealistic first-person jungle walk ending at overgrown ruins and a waterfall; every texture, mesh, and sound generated procedurally; built system-by-system behind an independent visual-critic loop. Run bare and with the full game skill pack (`JungleTrail-skills`). | Three.js |
| **Thunderforce** | 16-bit horizontal shoot-'em-up attract-mode demo (Thunder Force IV feel, original assets): 320×224 @ 60 FPS, 6–10 parallax layers, AI-flown ship, scripted biome events. | Three.js + Vite |
| **100-HTML** | Gallery of 100 single-file creative HTML/JS visualizations (glass UI, particle networks, kinetic type, …), each shipped with a `.txt` artifact recording the verbatim prompt, model, and run stats. | Vanilla JS + Canvas/WebGL |

## Results

| Test | Model                  | Result                                                    | Bug fix iterations |
|---|------------------------|-----------------------------------------------------------|--------------------|
| CityPulse | deepseek-v4-flash      | Partial — no collisions, minimal compass, no NPC dialogue | 2                  |
| CityPulse | Qwen3.6-27B            | Controls inverted, no compass                             | 0                  |
| CityPulse | Qwen3.6-35B-A3B        | Partial — no collisions, broken compass                   | ?                  |
| Pagoda | deepseek-v4-flash-0731 | weird colors                                              | 1                  |
| Pagoda | Qwen3.5-122B-A10B           | no rotation, slow af, and very simple/empty               | —                  |
| Pagoda | Qwen3.6-27B            | no rotation, but perfect                                  | —                  |
| Pagoda | Qwen3.6-35B-A3B        | ugly, but water animation?                                | —                  |
| HexGL | deepseek-v4-flash      | —                                                         | 0                  |
| HexGL | Qwen3.6-35B-A3B        | *not generated*                                           | —                  |
| Sol | deepseek-v4-flash      | —                                                         | 0                  |
| Sol | Qwen3.6-27B            | No Moon                                                   | 0                  |
| Sol | Qwen3.6-35B-A3B        | —                                                         | 0                  |
| Tetris | deepseek-v4-flash      | Working                                                   | 0                  |
| Tetris | Qwen3.6-27B            | Working                                                   | 0                  |
| Tetris | Qwen3.6-35B-A3B        | Partial — no Game Over screen                             | 0                  |
| HexConquest | Qwen3.6-35B-A3B        | —                                                         | 0                  |
| BlueMarble | Qwen3.6-35B-A3B        | —                                                         | 0                  |

> **Legend:** `—` = no notes (no obvious issues observed). `?` = iterations unknown.
> Results for JungleTrail, Thunderforce, 100-HTML, and the unsloth/Nemotron/Qwen3.8-Flash-Next runs are not recorded yet.

## Live previews

All generated HTML files are hosted on GitHub Pages:

- [deepseek-v4-flash — CityPulse](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/deepseek-v4-flash/CityPulse/index.html)
- [deepseek-v4-flash — HexGL](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/deepseek-v4-flash/HexGL/HexGL.html)
- [deepseek-v4-flash — Sol](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/deepseek-v4-flash/Sol/sol.html)
- [deepseek-v4-flash — Tetris](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/deepseek-v4-flash/Tetris/index.html)
- [DeepSeek-V4-Flash-0731 — Pagoda](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/DeepSeek-V4-Flash-0731/Pagoda/pagoda.html)
- [NVIDIA-Nemotron-3.5-Lightning-30B-A3B — Pagoda](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/NVIDIA-Nemotron-3.5-Lightning-30B-A3B/Pagoda/voxel-pagoda-garden.html)
- [Qwen3.5-122B-A10B — Pagoda](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.5-122B-A10B/Pagoda/Pagoda.html)
- [Qwen3.6-27B — Sol](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-27B/Sol/Sol.html)
- [Qwen3.6-27B — CityPulse](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-27B/CityPulse/CityPulse.html)
- [Qwen3.6-27B — Pagoda](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-27B/Pagoda/index.html)
- [Qwen3.6-27B — Tetris](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-27B/Tetris/Tetris.html)
- [Qwen3.6-35B-A3B — CityPulse](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/CityPulse/index.html)
- [Qwen3.6-35B-A3B — HexConquest](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/HexConquest/index.html)
- [Qwen3.6-35B-A3B — Pagoda](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/Pagoda/index.html)
- [Qwen3.6-35B-A3B — Sol](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/Sol/index.html)
- [Qwen3.6-35B-A3B — Tetris](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/Tetris/index.html)
- [Qwen3.6-35B-A3B — BlueMarble](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/BlueMarble/BlueMarble.html)
- [Qwen3.8-Flash-Next — Pagoda](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.8-Flash-Next/Pagoda/pagoda.html)
- [unsloth-Qwen3.8-27B-instruct — CityPulse](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/unsloth-Qwen3.8-27B-instruct/CityPulse/index.html)
- [unsloth-Qwen3.8-27B-instruct — Tetris](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/unsloth-Qwen3.8-27B-instruct/Tetris/tetris.html)
- [unsloth-Qwen3.8-27B-instruct — Pagoda](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/unsloth-Qwen3.8-27B-instruct/Pagoda/pagoda-garden.html)
- [unsloth-Qwen3.8-27B-thinking — Pagoda](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/unsloth-Qwen3.8-27B-thinking/Pagoda/pagoda.html)

100-HTML galleries (browse the folders):
[Qwen3.6-27B](https://github.com/iromu/llm-litmus/tree/main/Qwen3.6-27B/100-HTML) ·
[unsloth-Qwen3.8-27B-instruct](https://github.com/iromu/llm-litmus/tree/main/unsloth-Qwen3.8-27B-instruct/100-HTML) ·
[unsloth-Qwen3.8-27B-thinking](https://github.com/iromu/llm-litmus/tree/main/unsloth-Qwen3.8-27B-thinking/100-HTML)

## Setup

### Prerequisites

- A local OpenAI-compatible API endpoint (e.g. vLLM, Text Generation Inference)
- [Qwen Code](https://github.com/Qwen-Coder/Qwen-Coder) with the harness configured

### Configuration

Add your models to the harness config (`~/.qwen/qwen.json` or equivalent):

```jsonc
{
  "modelProviders": {
    "openai": [
      {
        "id": "Qwen3.6-35B-A3B",
        "name": "Qwen3.6-35B-A3B",
        "baseUrl": "http://spark.local:4000/v1",
        "generationConfig": {
          "timeout": 900000,
          "contextWindowSize": 262144,
          "reasoning_effort": "low",
          "reasoning": { "effort": "low" },
          "samplingParams": { "max_tokens": 32768 }
        }
      },
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash",
        "baseUrl": "http://spark.local:4000/v1",
        "generationConfig": {
          "timeout": 900000,
          "contextWindowSize": 100000,
          "reasoning_effort": "low",
          "reasoning": { "effort": "low" },
          "samplingParams": { "max_tokens": 384000 }
        }
      }
    ]
  }
}
```

### Link skills

Three.js skills are symlinked into each test directory:

```bash
# Link skills
./link-skills.sh

# Unlink (cleanup)
./link-skills.sh --unlink
```

## Project structure

```
.
├── .agents/skills/                       # Shared Three.js skill packs (symlink source)
├── deepseek-v4-flash/                    # Generated outputs, one directory per model
│   └── CityPulse/ HexGL/ Sol/ Tetris/
├── DeepSeek-V4-Flash-0731/Pagoda/
├── NVIDIA-Nemotron-3.5-Lightning-30B-A3B/Pagoda/
├── Qwen3.5-122B-A10B/Pagoda/
├── Qwen3.6-27B/
│   └── 100-HTML/ CityPulse/ JungleTrail/ JungleTrail-skills/ Pagoda/ Sol/ Tetris/
├── Qwen3.6-35B-A3B/
│   └── BlueMarble/ CityPulse/ HexConquest/ HexGL/ JungleTrail-skills/ Pagoda/ Sol/ Tetris/ Thunderforce/
├── Qwen3.8-Flash-Next/Pagoda/
├── unsloth-Qwen3.8-27B-instruct/
│   └── 100-HTML/ CityPulse/ JungleTrail/ JungleTrail-skills/ Pagoda/ Sol/ Tetris/
├── unsloth-Qwen3.8-27B-thinking/
│   └── 100-HTML/ CityPulse/ JungleTrail/ JungleTrail-skills/ Pagoda/ Sol/ Tetris/
├── link-skills.sh                        # Symlink management script
├── skills-lock.json                      # Hash-locked Three.js skill versions
└── README.md
```

Each test directory contains:
- `<test>.prompt.md` — the prompt given to the model
- The generated output — a single-file `<output>.html` for most tests; a Vite + TypeScript project for skill-driven game builds (JungleTrail, Thunderforce)
- Optional `<output>.prompt.txt` — verbatim creative prompt, model name, thinking effort, and run stats (wall time, tokens) for creative gallery work, so designs can be recreated or remixed
- `.agents/skills/` — symlinked Three.js skills, present in skill-injected runs

## License

MIT
