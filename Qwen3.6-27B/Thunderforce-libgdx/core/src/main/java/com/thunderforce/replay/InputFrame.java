package com.thunderforce.replay;

import com.badlogic.gdx.utils.Array;

/**
 * Single frame of input: direction + fire + weapon switch.
 * Packable into 4 bits for compact storage.
 */
public class InputFrame {

    public static final int DIR_NONE = 0;
    public static final int DIR_UP = 1;
    public static final int DIR_DOWN = 2;
    public static final int DIR_LEFT = 3;
    public static final int DIR_RIGHT = 4;
    public static final int DIR_UP_LEFT = 5;
    public static final int DIR_UP_RIGHT = 6;
    public static final int DIR_DOWN_LEFT = 7;
    public static final int DIR_DOWN_RIGHT = 8;

    public int direction;  // 0-8 (4 bits)
    public boolean fire;       // 1 bit
    public boolean weaponSwitch; // 1 bit

    public InputFrame() {
        this.direction = DIR_NONE;
        this.fire = false;
        this.weaponSwitch = false;
    }

    public InputFrame(int direction, boolean fire, boolean weaponSwitch) {
        this.direction = direction;
        this.fire = fire;
        this.weaponSwitch = weaponSwitch;
    }

    /**
     * Pack into a single byte: [dir:4bits][fire:1bit][weapon:1bit][pad:2bits]
     */
    public byte pack() {
        return (byte) ((direction & 0xF) << 4 | (fire ? 0x8 : 0) | (weaponSwitch ? 0x4 : 0));
    }

    /**
     * Unpack from a byte.
     */
    public void unpack(byte data) {
        this.direction = (data >> 4) & 0xF;
        this.fire = (data & 0x8) != 0;
        this.weaponSwitch = (data & 0x4) != 0;
    }

    /**
     * Compute a simple hash for desync detection.
     */
    public int hashCode() {
        return direction * 100 + (fire ? 10 : 0) + (weaponSwitch ? 1 : 0);
    }
}
