package com.thunderforce.desktop;

import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application;
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration;
import com.thunderforce.engine.ThunderforceGame;

/**
 * Desktop (LWJGL3) launcher.
 */
public class DesktopLauncher {

    public static void main(String[] arg) {
        Lwjgl3ApplicationConfiguration config = new Lwjgl3ApplicationConfiguration();
        config.setTitle("Thunderforce");
        config.setWindowedMode(1280, 960);
        config.useVsync(false);

        new Lwjgl3Application(new ThunderforceGame(), config);
    }
}
