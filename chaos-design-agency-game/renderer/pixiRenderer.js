// Pixi.js Renderer - Root application setup
// Handles Pixi app initialization and stage management

const PixiRenderer = (function() {
    'use strict';

    let app = null;
    let container = null;
    let stage = null;
    let isInitialized = false;

    const VIEWPORT_WIDTH = 800;
    const VIEWPORT_HEIGHT = 500;

    function init(canvasElement) {
        if (isInitialized) {
            console.warn('PixiRenderer already initialized');
            return;
        }

        if (!canvasElement) {
            console.error('PixiRenderer: canvas element not provided');
            return;
        }

        try {
            app = new PIXI.Application({
                width: VIEWPORT_WIDTH,
                height: VIEWPORT_HEIGHT,
                backgroundColor: 0xF5F5F5,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true
            });

            canvasElement.appendChild(app.view);
            stage = app.stage;
            container = new PIXI.Container();
            stage.addChild(container);

            isInitialized = true;
            console.log('PixiRenderer initialized');
        } catch (error) {
            console.error('PixiRenderer initialization failed:', error);
            throw error;
        }
    }

    function getApp() {
        if (!isInitialized) {
            throw new Error('PixiRenderer not initialized. Call init() first.');
        }
        return app;
    }

    function getStage() {
        if (!isInitialized) {
            throw new Error('PixiRenderer not initialized. Call init() first.');
        }
        return stage;
    }

    function getContainer() {
        if (!isInitialized) {
            throw new Error('PixiRenderer not initialized. Call init() first.');
        }
        return container;
    }

    function getTicker() {
        if (!isInitialized) {
            throw new Error('PixiRenderer not initialized. Call init() first.');
        }
        return app.ticker;
    }

    function destroy() {
        if (app) {
            app.destroy(true, { children: true, texture: true, baseTexture: true });
            app = null;
            stage = null;
            container = null;
            isInitialized = false;
        }
    }

    return {
        init,
        getApp,
        getStage,
        getContainer,
        getTicker,
        destroy,
        VIEWPORT_WIDTH,
        VIEWPORT_HEIGHT,
        isInitialized: () => isInitialized
    };
})();

window.PixiRenderer = PixiRenderer;









