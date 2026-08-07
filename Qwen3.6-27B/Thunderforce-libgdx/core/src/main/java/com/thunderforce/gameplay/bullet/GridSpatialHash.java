package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.utils.Array;

/**
 * Grid-based spatial hash for O(1) average-case collision lookup.
 * 16×16 pixel cells over a 320×224 playfield (20×14 grid).
 *
 * Cache-friendly design:
 * - Exposes raw cell arrays for zero-overhead hot-path access
 * - Pre-allocated inner arrays (no resize during gameplay)
 * - Direct index computation (no object indirection beyond cell arrays)
 * - GC-free query via caller-provided results buffer
 * - Linear scan helpers for tight collision loops
 */
public class GridSpatialHash {

    public static final int CELL_SIZE = 16;
    public static final int GRID_WIDTH = 20;  // 320 / 16
    public static final int GRID_HEIGHT = 14; // 224 / 16
    public static final int TOTAL_CELLS = GRID_WIDTH * GRID_HEIGHT;

    private final Array<Array<SpatialEntity>> cells;

    public GridSpatialHash() {
        this.cells = new Array<>(TOTAL_CELLS);
        for (int i = 0; i < TOTAL_CELLS; i++) {
            // Pre-size to typical occupancy to avoid resize allocations
            cells.add(new Array<>(true, 8));
        }
    }

    /**
     * Clear all cells for a new frame.
     */
    public void clear() {
        for (int i = 0; i < TOTAL_CELLS; i++) {
            cells.get(i).clear();
        }
    }

    /**
     * Insert an entity into the grid based on its bounding box.
     * Entity is added to all cells it overlaps.
     */
    public void insert(SpatialEntity entity) {
        Rectangle bounds = entity.getBounds();
        int cellX1 = Math.max(0, (int) (bounds.x / CELL_SIZE));
        int cellY1 = Math.max(0, (int) (bounds.y / CELL_SIZE));
        int cellX2 = Math.min(GRID_WIDTH - 1, (int) ((bounds.x + bounds.width) / CELL_SIZE));
        int cellY2 = Math.min(GRID_HEIGHT - 1, (int) ((bounds.y + bounds.height) / CELL_SIZE));

        for (int y = cellY1; y <= cellY2; y++) {
            int rowOffset = y * GRID_WIDTH;
            for (int x = cellX1; x <= cellX2; x++) {
                cells.get(rowOffset + x).add(entity);
            }
        }
    }

    /**
     * Query all entities that overlap the given bounding box.
     * Uses a caller-provided results buffer to avoid allocation.
     *
     * @param x        query X
     * @param y        query Y
     * @param width    query width
     * @param height   query height
     * @param results  pre-allocated buffer (will be cleared)
     * @return the results buffer populated with matching entities
     */
    public Array<SpatialEntity> query(
        float x, float y, float width, float height,
        Array<SpatialEntity> results) {

        results.clear();
        int cellX1 = Math.max(0, (int) (x / CELL_SIZE));
        int cellY1 = Math.max(0, (int) (y / CELL_SIZE));
        int cellX2 = Math.min(GRID_WIDTH - 1, (int) ((x + width) / CELL_SIZE));
        int cellY2 = Math.min(GRID_HEIGHT - 1, (int) ((y + height) / CELL_SIZE));

        for (int cy = cellY1; cy <= cellY2; cy++) {
            int rowOffset = cy * GRID_WIDTH;
            for (int cx = cellX1; cx <= cellX2; cx++) {
                Array<SpatialEntity> cell = cells.get(rowOffset + cx);
                int cellSize = cell.size;
                SpatialEntity[] cellItems = cell.items;
                for (int i = 0; i < cellSize; i++) {
                    results.add(cellItems[i]);
                }
            }
        }
        return results;
    }

    /**
     * Query entities in a single cell.
     */
    public Array<SpatialEntity> queryCell(int cellX, int cellY) {
        int index = Math.max(0, Math.min(GRID_HEIGHT - 1, cellY)) * GRID_WIDTH
                   + Math.max(0, Math.min(GRID_WIDTH - 1, cellX));
        return cells.get(index);
    }

    /**
     * Get total entity count across all cells (for debugging).
     */
    public int getTotalEntries() {
        int count = 0;
        for (int i = 0; i < TOTAL_CELLS; i++) {
            count += cells.get(i).size;
        }
        return count;
    }

    // ------------------------------------------------------------------
    // Direct array access for cache-friendly hot paths
    // ------------------------------------------------------------------

    /**
     * Get the backing array of cells. Callers can iterate directly
     * over cells.items[index] for zero-method-call overhead.
     *
     * @return the cells array (do not modify structure)
     */
    public Array<Array<SpatialEntity>> getCells() {
        return cells;
    }

    /**
     * Compute the linear cell index for given grid coordinates.
     * Clamps to valid range.
     */
    public static int cellIndex(int cellX, int cellY) {
        return Math.max(0, Math.min(GRID_HEIGHT - 1, cellY)) * GRID_WIDTH
             + Math.max(0, Math.min(GRID_WIDTH - 1, cellX));
    }

    /**
     * Compute the grid cell X coordinate for a world X position.
     */
    public static int cellX(float worldX) {
        int cx = (int) (worldX / CELL_SIZE);
        return Math.max(0, Math.min(GRID_WIDTH - 1, cx));
    }

    /**
     * Compute the grid cell Y coordinate for a world Y position.
     */
    public static int cellY(float worldY) {
        int cy = (int) (worldY / CELL_SIZE);
        return Math.max(0, Math.min(GRID_HEIGHT - 1, cy));
    }
}
