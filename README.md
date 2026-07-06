# llm-litmus

A controlled benchmark for evaluating how well large language models generate complex, single-file HTML/JS applications from a single prompt.

## Methodology

Each model receives the **same prompt** for a given test scenario. The prompt may include injected [Three.js skills](https://github.com/cloudai-x/threejs-skills) to level the playing field across models with different knowledge cutoff dates.

The generated HTML output is evaluated for:
- **Correctness** — does the app run without errors?
- **Feature completeness** — are all required features present?
- **Bug fix iterations** — how many autocorrect cycles were needed when the initial output was broken? Error logs are passed back to the model "as is" for each iteration.

## Models tested

| Model | Tests run |
|---|---|
| [deepseek-v4-flash](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash) | CityPulse, HexGL, Sol, Tetris |
| [Qwen3.6-35B-A3B](https://qwenlm.github.io/blog/qwen3.6/) | CityPulse, HexConquest, HexGL, Sol, Tetris |
| [Qwen3.6-27B](https://qwenlm.github.io/blog/qwen3.6/) | Tetris |

## Test scenarios

| Test | Description | Tech stack |
|---|---|---|
| **CityPulse** | Elder Scrolls-style open-world city exploration with third-person character, NPC dialogue, and fetch quests. | Three.js |
| **HexGL** | Futuristic anti-gravity racing with procedural tracks, physics-based drift, bloom post-processing, and particle trails. | Three.js |
| **Sol** | Interactive 3D solar system with proportional orbit speeds, hover tooltips, and speed controls. | Three.js |
| **Tetris** | Classic Tetris with particle effects and neon visuals. | Vanilla JS + Canvas |
| **HexConquest** | Turn-based hex-grid strategy (Civilization-lite) with terrain, fog of war, AI opponent, and a tech tree. | Vanilla JS + Canvas |

## Results

| Test | Model | Result | Bug fix iterations |
|---|---|---|---|
| CityPulse | deepseek-v4-flash | Partial — no collisions, minimal compass, no NPC dialogue | 2 |
| CityPulse | Qwen3.6-35B-A3B | Partial — no collisions, broken compass | ? |
| HexGL | deepseek-v4-flash | — | 0 |
| HexGL | Qwen3.6-35B-A3B | *not generated* | — |
| Sol | deepseek-v4-flash | — | 0 |
| Sol | Qwen3.6-35B-A3B | — | 0 |
| Tetris | deepseek-v4-flash | Working | 0 |
| Tetris | Qwen3.6-27B | Partial — hangs on space key | 0 |
| Tetris | Qwen3.6-35B-A3B | Partial — no Game Over screen | 0 |
| HexConquest | Qwen3.6-35B-A3B | — | 0 |

> **Legend:** `—` = no notes (no obvious issues observed). `?` = iterations unknown.

## Live previews

All generated HTML files are hosted on GitHub Pages:

- [deepseek-v4-flash — CityPulse](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/deepseek-v4-flash/CityPulse/index.html)
- [deepseek-v4-flash — HexGL](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/deepseek-v4-flash/HexGL/HexGL.html)
- [deepseek-v4-flash — Sol](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/deepseek-v4-flash/Sol/sol.html)
- [deepseek-v4-flash — Tetris](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/deepseek-v4-flash/Tetris/index.html)
- [Qwen3.6-27B — Tetris](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-27B/Tetris/Tetris.html)
- [Qwen3.6-35B-A3B — CityPulse](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/CityPulse/index.html)
- [Qwen3.6-35B-A3B — HexConquest](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/HexConquest/index.html)
- [Qwen3.6-35B-A3B — Sol](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/Sol/index.html)
- [Qwen3.6-35B-A3B — Tetris](https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/Tetris/index.html)

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
├── deepseek-v4-flash/     # Generated outputs for deepseek-v4-flash
│   ├── CityPulse/
│   ├── HexGL/
│   ├── Sol/
│   └── Tetris/
├── Qwen3.6-27B/           # Generated outputs for Qwen3.6-27B
│   └── Tetris/
├── Qwen3.6-35B-A3B/       # Generated outputs for Qwen3.6-35B-A3B
│   ├── CityPulse/
│   ├── HexConquest/
│   ├── HexGL/
│   ├── Sol/
│   └── Tetris/
├── link-skills.sh         # Symlink management script
├── skills-lock.json       # Locked Three.js skill versions
└── README.md
```

Each test directory contains:
- `<test>.prompt.md` — the prompt given to the model
- `<output>.html` — the generated single-file application

## License

MIT