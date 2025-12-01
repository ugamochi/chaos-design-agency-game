// DOM Helper Utilities
// Reduces repeated querySelector/getElementById patterns across the codebase

const DOMHelpers = (function() {
    'use strict';

    function $(selector) {
        return document.querySelector(selector);
    }

    function $$(selector) {
        return Array.from(document.querySelectorAll(selector));
    }

    function getById(id) {
        return document.getElementById(id);
    }

    function createElement(tag, className = '', attributes = {}) {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }

    function createModal(content, className = 'modal-content') {
        const overlay = createElement('div', 'modal-overlay');
        const modal = createElement('div', className);
        
        if (typeof content === 'string') {
            modal.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            modal.appendChild(content);
        }
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        return { overlay, modal };
    }

    function closeModalOnClick(overlay, modal) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    function setTextContent(selector, text) {
        let element;
        if (typeof selector === 'string') {
            if (selector.startsWith('#') || selector.startsWith('.') || selector.includes(' ')) {
                element = $(selector);
            } else {
                element = getById(selector);
            }
        } else {
            element = selector;
        }
        if (element) {
            element.textContent = text;
        }
    }

    function setInnerHTML(selector, html) {
        let element;
        if (typeof selector === 'string') {
            if (selector.startsWith('#') || selector.startsWith('.') || selector.includes(' ')) {
                element = $(selector);
            } else {
                element = getById(selector);
            }
        } else {
            element = selector;
        }
        if (element) {
            element.innerHTML = html;
        }
    }

    function getElement(selector) {
        if (typeof selector === 'string') {
            if (selector.startsWith('#') || selector.startsWith('.') || selector.includes(' ')) {
                return $(selector);
            } else {
                return getById(selector);
            }
        }
        return selector;
    }

    function addClass(selector, className) {
        const element = getElement(selector);
        if (element) {
            element.classList.add(className);
        }
    }

    function removeClass(selector, className) {
        const element = getElement(selector);
        if (element) {
            element.classList.remove(className);
        }
    }

    function toggleClass(selector, className) {
        const element = getElement(selector);
        if (element) {
            element.classList.toggle(className);
        }
    }

    function hasClass(selector, className) {
        const element = getElement(selector);
        return element ? element.classList.contains(className) : false;
    }

    function setStyle(selector, styles) {
        const element = getElement(selector);
        if (element) {
            Object.assign(element.style, styles);
        }
    }

    function removeElement(selector) {
        const element = typeof selector === 'string' ? $(selector) : selector;
        if (element && element.parentNode) {
            element.remove();
        }
    }

    return {
        $,
        $$,
        getById,
        createElement,
        createModal,
        closeModalOnClick,
        setTextContent,
        setInnerHTML,
        addClass,
        removeClass,
        toggleClass,
        hasClass,
        setStyle,
        removeElement
    };
})();

window.DOM = DOMHelpers;

