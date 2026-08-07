package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Rectangle;

/**
 * Laser beam with a 500ms pre-fire warning indicator.
 * Phase progression: WARNING -> FIRING -> DONE.
 */
public class LaserWarning implements SpatialEntity {

    public static final int ENTITY_TYPE = 1;
    public static final float WARNING_TIME = 0.5f;
    private static final TextureRegion WHITE = new TextureRegion(WhiteTexture.get());

    public enum Phase {
        WARNING,
        FIRING,
        DONE
    }

    public final float x1;
    public final float y1;
    public final float x2;
    public final float y2;
    public final float duration;

    private float fireTime;
    private Phase phase;
    private float elapsed;
    private final Rectangle bounds;

    public LaserWarning(float x1, float y1, float x2, float y2, float duration) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.duration = duration;
        this.phase = Phase.WARNING;
        this.elapsed = 0;
        this.fireTime = 0;
        this.bounds = new Rectangle();
    }

    /**
     * Update phase and timing.
     */
    public void update(float delta) {
        elapsed += delta;

        if (phase == Phase.WARNING) {
            if (elapsed >= WARNING_TIME) {
                phase = Phase.FIRING;
                fireTime = 0;
            }
        } else if (phase == Phase.FIRING) {
            fireTime += delta;
            if (fireTime >= duration) {
                phase = Phase.DONE;
            }
        }
    }

    public boolean isFiring() {
        return phase == Phase.FIRING;
    }

    public boolean isDone() {
        return phase == Phase.DONE;
    }

    public Phase getPhase() {
        return phase;
    }

    /**
     * Check if a point is within the laser beam path.
     * Uses perpendicular distance from the line segment.
     *
     * @param px point X
     * @param py point Y
     * @param tolerance half-beam width in pixels
     * @return true if point is within beam
     */
    public boolean intersectsPoint(float px, float py, float tolerance) {
        float dx = x2 - x1;
        float dy = y2 - y1;
        float lenSq = dx * dx + dy * dy;
        if (lenSq == 0) {
            return Math.abs(px - x1) < tolerance && Math.abs(py - y1) < tolerance;
        }
        float t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0f, Math.min(1f, t));
        float closestX = x1 + t * dx;
        float closestY = y1 + t * dy;
        float distX = px - closestX;
        float distY = py - closestY;
        return (distX * distX + distY * distY) < tolerance * tolerance;
    }

    /**
     * Check if the laser beam intersects a rectangle (for player collision).
     *
     * @param rect the rectangle to check
     * @return true if the beam overlaps the rectangle during firing phase
     */
    public boolean intersectsRectangle(Rectangle rect) {
        if (!isFiring()) {
            return false;
        }
        float beamWidth = 8f;
        float dx = x2 - x1;
        float dy = y2 - y1;
        float len = (float) Math.sqrt(dx * dx + dy * dy);
        if (len == 0) {
            return false;
        }

        float nx = -dy / len;
        float ny = dx / len;

        float[] corners = {
                rect.x, rect.y,
                rect.x + rect.width, rect.y,
                rect.x, rect.y + rect.height,
                rect.x + rect.width, rect.y + rect.height
        };

        for (int i = 0; i < corners.length; i += 2) {
            if (intersectsPoint(corners[i], corners[i + 1], beamWidth)) {
                return true;
            }
        }

        float cx = rect.x + rect.width * 0.5f;
        float cy = rect.y + rect.height * 0.5f;
        if (intersectsPoint(cx, cy, beamWidth)) {
            return true;
        }

        return false;
    }

    @Override
    public Rectangle getBounds() {
        float minX = Math.min(x1, x2);
        float minY = Math.min(y1, y2);
        float maxX = Math.max(x1, x2);
        float maxY = Math.max(y1, y2);
        bounds.set(minX, minY, maxX - minX, maxY - minY);
        return bounds;
    }

    @Override
    public int getEntityType() {
        return ENTITY_TYPE;
    }

    /**
     * Render the laser warning or firing beam.
     */
    public void render(Batch batch) {
        if (phase == Phase.WARNING) {
            renderWarning(batch);
        } else if (phase == Phase.FIRING) {
            renderFiring(batch);
        }
    }

    private void renderWarning(Batch batch) {
        float pulse = 0.5f + 0.5f * (float) Math.sin(elapsed * 12f);
        float alpha = 0.4f + 0.6f * pulse;

        float dx = x2 - x1;
        float dy = y2 - y1;
        float len = (float) Math.sqrt(dx * dx + dy * dy);
        if (len == 0) return;

        float stepX = dx / len;
        float stepY = dy / len;
        float dashLen = 6f;
        float gapLen = 4f;
        float totalDash = dashLen + gapLen;
        float dist = 0;
        boolean drawing = true;

        while (dist < len) {
            float segmentLen = drawing ? dashLen : gapLen;
            float nextDist = Math.min(dist + segmentLen, len);

            if (drawing) {
                float sx = x1 + stepX * dist;
                float sy = y1 + stepY * dist;
                float ex = x1 + stepX * nextDist;
                float ey = y1 + stepY * nextDist;
                float segLen = (float) Math.sqrt((ex - sx) * (ex - sx) + (ey - sy) * (ey - sy));
                if (segLen > 0) {
                    float angle = (float) Math.toDegrees(Math.atan2(ey - sy, ex - sx));
                    float cx = (sx + ex) * 0.5f;
                    float cy = (sy + ey) * 0.5f;
                    batch.setColor(1f, 0.3f, 0f, alpha);
                    batch.draw(WHITE, cx, cy, segLen, 2f, segLen, 2f, 1f, 1f, angle);
                }
            }

            dist = nextDist;
            drawing = !drawing;
        }
        batch.setColor(Color.WHITE);
    }

    private void renderFiring(Batch batch) {
        float dx = x2 - x1;
        float dy = y2 - y1;
        float len = (float) Math.sqrt(dx * dx + dy * dy);
        if (len == 0) return;

        float angle = (float) Math.toDegrees(Math.atan2(dy, dx));
        float cx = (x1 + x2) * 0.5f;
        float cy = (y1 + y2) * 0.5f;

        batch.setColor(1f, 0.2f, 0.2f, 0.9f);
        batch.draw(WHITE, cx, cy, len, 8f, len, 8f, 1f, 1f, angle);

        batch.setColor(1f, 0.8f, 0.6f, 0.7f);
        batch.draw(WHITE, cx, cy, len, 2f, len, 2f, 1f, 1f, angle);

        batch.setColor(Color.WHITE);
    }

    /**
     * Render with ShapeRenderer for smoother lines.
     */
    public void render(ShapeRenderer shapeRenderer) {
        if (phase == Phase.WARNING) {
            float pulse = 0.5f + 0.5f * (float) Math.sin(elapsed * 12f);
            float alpha = 0.4f + 0.6f * pulse;
            shapeRenderer.setColor(1f, 0.3f, 0f, alpha);
            shapeRenderer.line(x1, y1, x2, y2);
        } else if (phase == Phase.FIRING) {
            shapeRenderer.setColor(1f, 0.2f, 0.2f, 0.9f);
            shapeRenderer.rectLine(x1, y1, x2, y2, 8f);
            shapeRenderer.setColor(1f, 0.8f, 0.6f, 0.7f);
            shapeRenderer.line(x1, y1, x2, y2);
        }
    }
}
