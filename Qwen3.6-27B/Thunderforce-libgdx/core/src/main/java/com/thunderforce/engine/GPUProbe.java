package com.thunderforce.engine;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Application.ApplicationType;
import com.thunderforce.config.QualityTier;

import java.nio.IntBuffer;

/**
 * GPU capability probe: detects renderer and selects appropriate quality tier.
 */
public class GPUProbe {

    private static final String[] MOBILE_KEYWORDS = {
        "mali", "adreno", "powervr", "intel", "iris", "swiftshader", "llvmpipe",
        "virtio", "virtual", "software"
    };

    private static final String[] DESKTOP_KEYWORDS = {
        "nvidia", "geforce", "radeon", "rx", "rtx", "gtx", "amd", "intel arc"
    };

    public static QualityTier detect() {
        String renderer = getRenderer();
        int maxTextureSize = getMaxTextureSize();

        if (Gdx.app.getType() != ApplicationType.Desktop) {
            return QualityTier.MEDIUM;
        }

        boolean isMobile = false;
        boolean isDesktop = false;

        for (String keyword : MOBILE_KEYWORDS) {
            if (renderer.toLowerCase().contains(keyword)) {
                isMobile = true;
                break;
            }
        }

        for (String keyword : DESKTOP_KEYWORDS) {
            if (renderer.toLowerCase().contains(keyword)) {
                isDesktop = true;
                break;
            }
        }

        if (isDesktop && maxTextureSize >= 8192) {
            return QualityTier.HIGH;
        }
        if (isMobile || maxTextureSize < 4096) {
            return QualityTier.LOW;
        }

        return QualityTier.MEDIUM;
    }

    public static String getRenderer() {
        try {
            return Gdx.graphics.getGLVersion().toString();
        } catch (Exception e) {
            return "unknown";
        }
    }

    public static int getMaxTextureSize() {
        try {
            IntBuffer value = IntBuffer.allocate(1);
            Gdx.gl20.glGetIntegerv(com.badlogic.gdx.graphics.GL20.GL_MAX_TEXTURE_SIZE, value);
            return value.get(0);
        } catch (Exception e) {
            return 4096;
        }
    }

    public static String getGLVersion() {
        try {
            return Gdx.graphics.getGLVersion().toString();
        } catch (Exception e) {
            return "unknown";
        }
    }
}
