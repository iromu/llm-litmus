package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.utils.Array;

/**
 * Grid-based spatial hash for O(1) average-case collision lookup.
 * 16×16 pixel cells over a 320×224 playfield (20×14 grid).
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
            for (int x = cellX1; x <= cellX2; x++) {
                int index = y * GRID_WIDTH + x;
                cells.get(index).add(entity);
            }
        }
    }

    /**
     * Query all entities that overlap the given bounding box.
     * Results are deduplicated by the caller.
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
            for (int cx = cellX1; cx <= cellX2; cx++) {
                int index = cy * GRID_WIDTH + cx;
                Array<SpatialEntity> cell = cells.get(index);
                for (int i = 0; i < cell.size; i++) {
                    results.add(cell.get(i));
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
}
