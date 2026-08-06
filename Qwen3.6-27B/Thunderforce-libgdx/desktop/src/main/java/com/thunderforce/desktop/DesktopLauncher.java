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
        config.useVsync(true);
        config.setWindowIcon("icons/thunderforce-64.png", "icons/thunderforce-32.png",
            "icons/thunderforce-16.png");

        new Lwjgl3Application(new ThunderforceGame(), config);
    }
}
