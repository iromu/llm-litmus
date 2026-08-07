---
name: Bosses
description: Three multi-phase bosses with destructible sections, phase transitions, and cinematic death sequences
type: feature
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Bosses

## Boss Overview

Three multi-phase bosses, each composed of destructible `BossSection` instances:

| Boss | Total HP | Score | Sections | Theme |
|------|---------|-------|----------|-------|
| **Magma Maw** | 200 | 5000 | CORE(80), DRILL_LEFT(20), DRILL_RIGHT(20), 4×TURRET(10) | Volcanic mining machine |
| **Orbital Judge** | 300 | 8000 | CORE(120), WING_LEFT(40), WING_RIGHT(40), ROTATING_WEAPONS(30) | Transforming orbital battleship |
| **Xeno Guardian** | 250 | 6000 | CORE(100), 3×TENTACLE(20), BEAM_EYE(15) | Biomechanical alien guardian |

## Boss Base Class

Abstract `Boss` class with template method pattern:

| Abstract Method | Purpose |
|----------------|---------|
| `defineSections()` | Return array of `BossSection` instances |
| `executePhaseAttack()` | Execute phase-specific attack patterns |
| `renderPhaseEffects()` | Render phase-specific visual effects |
| `renderDeathSequence()` | Render multi-stage death animation |

### Lifecycle

1. **Entry animation** — 2-second entrance sequence
2. **Active combat** — Sections fire attacks at phase-scaled intervals
3. **Phase transitions** — Triggered at HP thresholds
4. **Death sequence** — Multi-stage destruction animation

### Phase Transitions

| Boss | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| Magma Maw | 100% | 75% HP | 25% HP |
| Orbital Judge | 100% | 60% HP | 20% HP |
| Xeno Guardian | 100% | 65% HP | 20% HP |

## BossSection

Each section has independent HP, position offsets, dimensions, and attack pattern:

| Property | Type | Description |
|----------|------|-------------|
| `offsetX`, `offsetY` | float | Position relative to boss center |
| `width`, `height` | float | Section dimensions |
| `hp`, `maxHp` | int | Independent health |
| `attackPattern` | String | "aimed", "aimed_spread", "spiral", "sweep", "homing", "area_denial", "drill_advance", "beam" |
| `attackInterval` | float | Seconds between attacks |

### Section Types

`CORE`, `ARM`, `TURRET`, `WING`, `ENGINE`, `TENTACLE`, `DRILL`, `BEAM_EYE`, `ROTATING_WEAPONS`

### BossFireCommand

Sections emit `BossFireCommand` instances to request bullet spawns. Commands are collected by the boss and converted to actual bullets.

## Magma Maw

- **Sections**: Core (80 HP), Left/Right Drills (20 HP each), 4× Turrets (10 HP each)
- **Death sequence**: Drills collapse → Turrets explode → Core implodes (3.5s)
- **Phases**: 75% HP → increased attack rate, 25% HP → frenzy mode

## Orbital Judge

- **Sections**: Core (120 HP), Left/Right Wings (40 HP each), Rotating Weapons (30 HP)
- **Wing transformation**: Wing positions change per phase with smoothstep interpolation
- **Death sequence**: Wings detach → Weapons explode → Core supernova (4s)
- **Phases**: 60% HP → wing reconfiguration, 20% HP → final assault

## Xeno Guardian

- **Sections**: Core (100 HP), 3× Tentacles (20 HP each), Beam Eye (15 HP)
- **Tentacle animation**: Sine-wave wobble with per-tentacle phase offset
- **Beam attack**: Charge → Fire cycle with warning indicator
- **Death sequence**: Tentacles wither → Eye explodes → Core dissolves (3.5s)
- **Phases**: 65% HP → tentacle frenzy, 20% HP → beam barrage

## JSON Configuration

Boss definitions stored in `data/bosses/*.json`:

```json
{
  "id": "magma_maw",
  "name": "Magma Maw",
  "scoreValue": 5000,
  "sections": [
    {"type": "CORE", "hp": 80, "offsetX": 0, "offsetY": 0, "attackPattern": "spiral"},
    {"type": "DRILL", "hp": 20, "offsetX": -40, "offsetY": 0, "attackPattern": "drill_advance"}
  ],
  "phases": [
    {"phase": 1, "hpThreshold": 0.75, "attacks": ["spiral", "aimed"], "attackInterval": 1.0},
    {"phase": 2, "hpThreshold": 0.25, "attacks": ["spiral", "aimed_spread", "sweep"], "attackInterval": 0.5}
  ]
}
```
