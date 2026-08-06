package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.math.Rectangle;

/**
 * Interface for entities that participate in spatial hash collision detection.
 */
public interface SpatialEntity {
    Rectangle getBounds();
    int getEntityType();
}
