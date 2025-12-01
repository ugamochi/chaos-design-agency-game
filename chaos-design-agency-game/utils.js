// Utility functions module

const Utils = (function() {
    'use strict';

    async function loadJson(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error(`Error loading ${url}:`, error);
            return [];
        }
    }

    function cloneObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function formatCurrency(amount) {
        return `$${Math.abs(amount).toLocaleString()}`;
    }

    function formatPercent(value) {
        return `${Math.round(value)}%`;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getInitials(name) {
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    return {
        loadJson,
        cloneObject,
        formatCurrency,
        formatPercent,
        clamp,
        getInitials,
        debounce,
        throttle
    };
})();

window.Utils = Utils;



