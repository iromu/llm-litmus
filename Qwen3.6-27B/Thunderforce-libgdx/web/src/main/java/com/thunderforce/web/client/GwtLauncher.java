package com.thunderforce.web.client;

import com.badlogic.gdx.ApplicationListener;
import com.badlogic.gdx.backends.gwt.GwtApplication;
import com.badlogic.gdx.backends.gwt.GwtApplicationConfiguration;
import com.thunderforce.engine.ThunderforceGame;

/**
 * GWT entry point for the web backend.
 */
public class GwtLauncher extends GwtApplication {

    @Override
    public GwtApplicationConfiguration getConfig() {
        return new GwtApplicationConfiguration(1280, 960);
    }

    @Override
    public ApplicationListener createApplicationListener() {
        return new ThunderforceGame();
    }
}
