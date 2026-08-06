package com.thunderforce.gameplay.player;

import com.badlogic.gdx.math.Vector2;

/**
 * Eight-direction input plus no-input, mapped to the classic shoot-'em-up control scheme.
 * Values align with InputFrame direction constants for replay compatibility.
 */
public enum InputDirection {

    NONE(0, 0f, 0f),
    UP(1, 0f, 1f),
    DOWN(2, 0f, -1f),
    LEFT(3, -1f, 0f),
    RIGHT(4, 1f, 0f),
    UP_LEFT(5, -1f, 1f),
    UP_RIGHT(6, 1f, 1f),
    DOWN_LEFT(7, -1f, -1f),
    DOWN_RIGHT(8, 1f, -1f);

    private final int code;
    private final float nx;
    private final float ny;
    private final Vector2 normalized;

    InputDirection(int code, float nx, float ny) {
        this.code = code;
        this.nx = nx;
        this.ny = ny;
        float len = (float) Math.sqrt(nx * nx + ny * ny);
        if (len > 0) {
            this.normalized = new Vector2(nx / len, ny / len);
        } else {
            this.normalized = new Vector2();
        }
    }

    /**
     * Return the integer code matching InputFrame direction constants.
     */
    public int getCode() {
        return code;
    }

    /**
     * Return a normalized Vector2 for this direction.
     * NONE returns (0, 0).
     */
    public Vector2 toVector2() {
        return normalized;
    }

    /**
     * Build an InputDirection from raw keyboard flags.
     * Diagonals are produced when two orthogonal keys are held together.
     */
    public static InputDirection fromInput(boolean up, boolean down, boolean left, boolean right) {
        boolean h = left || right;
        boolean v = up || down;
        if (!h && !v) return NONE;
        if (h && v) {
            if (left && up) return UP_LEFT;
            if (right && up) return UP_RIGHT;
            if (left && down) return DOWN_LEFT;
            return DOWN_RIGHT;
        }
        if (up) return UP;
        if (down) return DOWN;
        if (left) return LEFT;
        return RIGHT;
    }

    /**
     * Build from an InputFrame direction code.
     */
    public static InputDirection fromCode(int code) {
        for (InputDirection dir : values()) {
            if (dir.code == code) return dir;
        }
        return NONE;
    }
}
