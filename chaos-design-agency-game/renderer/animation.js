// Animation helpers for smooth tweening
// Provides lerp-based smooth movement for Pixi objects

const AnimationHelper = (function() {
    'use strict';

    function lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    function smoothStep(t) {
        return t * t * (3 - 2 * t);
    }

    function updatePosition(obj, targetX, targetY, smoothing = 0.15) {
        if (!obj) return;

        const currentX = obj.x || 0;
        const currentY = obj.y || 0;

        const dx = targetX - currentX;
        const dy = targetY - currentY;

        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
            obj.x = targetX;
            obj.y = targetY;
            return false;
        }

        obj.x = lerp(currentX, targetX, smoothing);
        obj.y = lerp(currentY, targetY, smoothing);
        return true;
    }

    function updateScale(obj, targetScale, smoothing = 0.1) {
        if (!obj) return;

        const currentScale = obj.scale.x || 1;
        const diff = targetScale - currentScale;

        if (Math.abs(diff) < 0.01) {
            obj.scale.set(targetScale);
            return false;
        }

        const newScale = lerp(currentScale, targetScale, smoothing);
        obj.scale.set(newScale);
        return true;
    }

    function updateAlpha(obj, targetAlpha, smoothing = 0.1) {
        if (!obj) return;

        const currentAlpha = obj.alpha || 1;
        const diff = targetAlpha - currentAlpha;

        if (Math.abs(diff) < 0.01) {
            obj.alpha = targetAlpha;
            return false;
        }

        obj.alpha = lerp(currentAlpha, targetAlpha, smoothing);
        return true;
    }

    function createPulseAnimation(baseValue, speed = 0.005, amplitude = 0.1) {
        let time = 0;
        return {
            update: (delta) => {
                time += delta * speed;
                return baseValue + Math.sin(time) * amplitude;
            },
            reset: () => { time = 0; }
        };
    }

    function createBreathingAnimation(baseRadius, speed = 0.003, amplitude = 0.5) {
        let time = 0;
        return {
            update: (delta) => {
                time += delta * speed;
                return baseRadius + Math.sin(time) * amplitude;
            },
            reset: () => { time = 0; }
        };
    }

    return {
        lerp,
        smoothStep,
        updatePosition,
        updateScale,
        updateAlpha,
        createPulseAnimation,
        createBreathingAnimation
    };
})();

window.AnimationHelper = AnimationHelper;









