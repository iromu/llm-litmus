package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.Pixmap;

/**
 * Shared white pixel texture for drawing primitives with SpriteBatch.
 * Lazy-initialized, thread-safe via double-checked locking.
 */
public final class WhiteTexture {

    private static Texture instance;

    private WhiteTexture() {
    }

    public static Texture get() {
        if (instance == null) {
            synchronized (WhiteTexture.class) {
                if (instance == null) {
                    Pixmap px = new Pixmap(1, 1, Pixmap.Format.RGBA8888);
                    px.setColor(1f, 1f, 1f, 1f);
                    px.drawPixel(0, 0);
                    instance = new Texture(px);
                    px.dispose();
                }
            }
        }
        return instance;
    }

    public static void dispose() {
        if (instance != null) {
            instance.dispose();
            instance = null;
        }
    }
}
