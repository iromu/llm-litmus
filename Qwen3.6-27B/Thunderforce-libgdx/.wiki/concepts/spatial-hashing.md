---
name: Spatial Hashing
description: Grid-based broad-phase collision detection with 20x14 grid over 320x224 playfield
type: concept
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Spatial Hashing

## GridSpatialHash

Grid-based spatial partitioning for broad-phase collision detection. Divides the 320×224 playfield into a uniform grid of cells.

### Configuration

| Parameter | Value |
|-----------|-------|
| Cell size | 16×16 pixels |
| Grid dimensions | 20 columns × 14 rows |
| Total cells | 280 |
| Entity type codes | 0 = enemy, 1 = bullet, 2 = boss, 3 = player bullet |

### Operations

```java
// Clear all cells (called once per frame)
grid.clear();

// Insert entity into all overlapping cells
grid.insert(entity);

// Query entities in cells overlapping a rectangle
Array<SpatialEntity> candidates = grid.query(bounds);
```

### Insert Algorithm

An entity is inserted into every cell its bounds overlap:

```
minCellX = floor(bounds.x / cellSize)
minCellY = floor(bounds.y / cellSize)
maxCellX = floor((bounds.x + bounds.width) / cellSize)
maxCellY = floor((bounds.y + bounds.height) / cellSize)

for each cell in [minCellX..maxCellX] × [minCellY..maxCellY]:
    cells[cellX][cellY].add(entity)
```

### Query Algorithm

Returns all entities in cells overlapping the query bounds:

```
for each cell in overlapping range:
    for each entity in cell:
        if entity not in result:
            result.add(entity)
```

Duplicate entities are avoided by checking membership before adding.

## CollisionDetector

Two-phase collision detection:

### Phase 1: Player Bullets vs Enemies (Spatial Hash)

1. Insert all alive enemies into `GridSpatialHash`
2. For each alive player bullet:
   - Query grid for candidate enemies
   - AABB narrow-phase check against each candidate
   - On hit: apply damage, mark bullet for death (unless penetrating)

### Phase 2: Enemy Bullets vs Player (Linear Scan)

1. Linear scan of all alive enemy bullets against player hitbox
2. AABB overlap check
3. On hit: player takes damage (shield absorption or life loss)

### Collision Pair

```java
class Collision {
    SpatialEntity entityA;
    SpatialEntity entityB;
}
```

## SpatialEntity Interface

Any entity that participates in collision detection implements:

```java
interface SpatialEntity {
    Rectangle getBounds();    // AABB bounds
    int getEntityType();       // Type code for filtering
}
```

Implementers: `Enemy`, `Bullet`, `Projectile`, `LaserWarning`, `AreaDenial`
