// Logger Utility
// Conditional console logging - can be disabled in production

const Logger = (function() {
    'use strict';

    const isDevMode = () => {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('debug=true');
    };

    const devMode = isDevMode();

    function log(...args) {
        if (devMode) {
            console.log(...args);
        }
    }

    function error(...args) {
        console.error(...args);
    }

    function warn(...args) {
        if (devMode) {
            console.warn(...args);
        }
    }

    function info(...args) {
        if (devMode) {
            console.info(...args);
        }
    }

    function debug(...args) {
        if (devMode) {
            console.debug(...args);
        }
    }

    function group(label) {
        if (devMode) {
            console.group(label);
        }
    }

    function groupEnd() {
        if (devMode) {
            console.groupEnd();
        }
    }

    return {
        log,
        error,
        warn,
        info,
        debug,
        group,
        groupEnd,
        isDevMode: () => devMode
    };
})();

window.Logger = Logger;




