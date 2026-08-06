package com.thunderforce.parallax;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.glutils.ShaderProgram;

/**
 * Palette cycling shader with animatable 256-entry color LUT.
 * Takes texture color as LUT index, samples animated LUT texture.
 */
public class PaletteCyclingShader {

    private static final String vertexShader =
        "attribute vec4 a_position;" +
        "attribute vec4 a_color;" +
        "attribute vec2 a_texCoord0;" +
        "uniform mat4 u_projTrans;" +
        "varying vec4 v_color;" +
        "varying vec2 v_texCoord;" +
        "void main() {" +
        "  v_color = a_color;" +
        "  v_texCoord = a_texCoord0;" +
        "  gl_Position = u_projTrans * a_position;" +
        "}";

    private static final String fragmentShader =
        "precision mediump float;" +
        "varying vec4 v_color;" +
        "varying vec2 v_texCoord;" +
        "uniform sampler2D u_texture;" +
        "uniform sampler2D u_palette;" +
        "uniform float u_time;" +
        "void main() {" +
        "  vec4 texColor = texture2D(u_texture, v_texCoord);" +
        "  // Use red channel as palette index (0-255 mapped to 0-1)" +
        "  float index = texColor.r;" +
        "  // Add time-based offset for cycling" +
        "  float cycleIndex = fract(index + u_time * 0.05);" +
        "  // Sample palette LUT (1D texture stored as horizontal strip)" +
        "  vec4 palColor = texture2D(u_palette, vec2(cycleIndex, 0.5));" +
        "  gl_FragColor = vec4(palColor.rgb, texColor.a);" +
        "}";

    public static ShaderProgram create() {
        ShaderProgram.pedantic = false;
        ShaderProgram shader = new ShaderProgram(vertexShader, fragmentShader);
        if (!shader.isCompiled()) {
            Gdx.app.log("PaletteCyclingShader", "Compilation failed: " + shader.getLog());
            return null;
        }
        return shader;
    }
}
