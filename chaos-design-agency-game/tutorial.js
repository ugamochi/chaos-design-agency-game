// Tutorial System

const TutorialModule = (function() {
    'use strict';

    let tutorialState = {
    enabled: false, // Tutorial disabled by default
    completed: false,
    currentStep: 0,
    steps: [
        {
            id: 'welcome',
            title: 'Welcome to Agency Chaos Simulator!',
            message: 'You\'re running a small design agency. Survive 12 weeks by managing projects, keeping clients happy, and maintaining team morale.',
            target: null,
            position: 'center'
        },
        {
            id: 'resources',
            title: 'Your Resources',
            message: 'Keep an eye on Money (don\'t go bankrupt!), Team Morale (happy team = better work), and Client Satisfaction (determines payment).',
            target: '.resources',
            position: 'bottom'
        },
        {
            id: 'projects',
            title: 'Active Projects',
            message: 'Each project has progress, deadlines, and satisfaction. Projects without teams won\'t make progress!',
            target: '.project-timeline',
            position: 'top'
        },
        {
            id: 'team',
            title: 'Your Team',
            message: 'Assign team members to projects. Watch their morale - overworked team members will quit!',
            target: '.team-section',
            position: 'top'
        },
        {
            id: 'conversation_wait',
            title: 'Waiting for Conversation',
            message: 'The game runs in real-time. Your first client message will arrive automatically as time progresses.',
            target: '.clock-display',
            position: 'top',
            waitForConversation: true
        },
        {
            id: 'conversation',
            title: 'Client Messages',
            message: 'Clients will email you with requests, changes, and emergencies. Choose wisely - every choice has consequences!',
            target: '.conversation-container',
            position: 'top',
            waitForElement: '.conversation-container'
        },
        {
            id: 'choices',
            title: 'Make Your Choice',
            message: 'Each option shows what it will affect. Consider the impacts on money, morale, and client satisfaction.',
            target: '.conversation-choices',
            position: 'top'
        },
        {
            id: 'advance_time',
            title: 'Time Management',
            message: 'The game runs automatically in real-time (1 game hour = 1 real second). Each week costs money in payroll. Watch for deadline warnings!',
            target: '.clock-display',
            position: 'top'
        },
        {
            id: 'complete',
            title: 'You\'re Ready!',
            message: 'That\'s the basics! Remember: balance is key. Push too hard and team quits. Too cautious and you go broke. Good luck!',
            target: null,
            position: 'center'
        }
    ]
};

    function initTutorial() {
        const savedTutorialState = localStorage.getItem('agencyChaosTutorial');
        const isNewGame = window.GameState.currentWeek === 1 && window.GameState.currentDay === 1;
    
    // Initialize tutorial for new games
    if (isNewGame) {
        tutorialState.enabled = false; // Disabled by default
        tutorialState.completed = false;
        tutorialState.currentStep = 0;
        saveTutorialState();
    } else if (savedTutorialState) {
        // For existing games, load saved state with sensible defaults
        const saved = JSON.parse(savedTutorialState);
        tutorialState.completed = saved.completed !== undefined ? saved.completed : false;
        tutorialState.enabled = saved.enabled !== undefined ? saved.enabled : false; // Default to disabled
        tutorialState.currentStep = saved.currentStep || 0;
    } else {
        // No saved state - default to disabled
        tutorialState.enabled = false;
        tutorialState.completed = false;
        tutorialState.currentStep = 0;
        saveTutorialState();
    }

    // Start tutorial if enabled, not completed, and it's a new game
    if (tutorialState.enabled && !tutorialState.completed && isNewGame) {
        setTimeout(() => showTutorialStep(0), 1000);
    }
}

    function showTutorialStep(stepIndex) {
    if (!tutorialState.enabled || tutorialState.completed) return;
    if (stepIndex >= tutorialState.steps.length) {
        completeTutorial();
        return;
    }

    const step = tutorialState.steps[stepIndex];
    
    if (step.waitForElement) {
        const element = document.querySelector(step.waitForElement);
        if (!element) {
            setTimeout(() => showTutorialStep(stepIndex), 500);
            return;
        }
    }

    tutorialState.currentStep = stepIndex;
    saveTutorialState();

    removeTutorialOverlay();

    const overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay';
    overlay.id = 'tutorialOverlay';

    const tooltip = document.createElement('div');
    tooltip.className = `tutorial-tooltip ${step.position}`;
    
    tooltip.innerHTML = `
        <div class="tutorial-header">
            <h3>${step.title}</h3>
            <button class="tutorial-skip">Skip Tutorial</button>
        </div>
        <div class="tutorial-body">
            <p>${step.message}</p>
        </div>
        <div class="tutorial-footer">
            <span class="tutorial-progress">Step ${stepIndex + 1} of ${tutorialState.steps.length}</span>
            ${stepIndex < tutorialState.steps.length - 1 
                ? `<button class="tutorial-next">Next</button>`
                : `<button class="tutorial-next">Got it!</button>`
            }
        </div>
    `;

    overlay.appendChild(tooltip);
    document.body.appendChild(overlay);

    // Ensure tooltip is clickable
    tooltip.style.pointerEvents = 'auto';
    
    // Set up button handlers BEFORE adding overlay click handlers
    const skipButton = tooltip.querySelector('.tutorial-skip');
    const nextButton = tooltip.querySelector('.tutorial-next');
    
    if (skipButton) {
        skipButton.type = 'button';
        skipButton.style.cursor = 'pointer';
        skipButton.style.pointerEvents = 'auto';
        skipButton.style.zIndex = '2002';
        skipButton.style.position = 'relative'; // Ensure it's positioned
        
        // Remove any existing handlers
        const newSkipButton = skipButton.cloneNode(true);
        skipButton.parentNode.replaceChild(newSkipButton, skipButton);
        
        // Add click handler to the new button
        newSkipButton.addEventListener('click', function(e) {
            console.log('Skip button clicked!');
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            
            // Try multiple ways to call the function
            if (typeof window.skipTutorial === 'function') {
                window.skipTutorial();
            } else if (typeof skipTutorial === 'function') {
                skipTutorial();
            } else if (typeof TutorialModule.skipTutorial === 'function') {
                TutorialModule.skipTutorial();
            } else {
                console.error('skipTutorial function not found!');
                // Fallback: manually skip
                removeTutorialHighlight();
                removeTutorialOverlay();
                tutorialState.completed = true;
                tutorialState.enabled = false;
                saveTutorialState();
            }
            return false;
        }, true);
        
        // Also add mousedown to catch it even earlier
        newSkipButton.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        }, true);
    } else {
        console.warn('Skip tutorial button not found in tooltip');
    }
    
    if (nextButton) {
        nextButton.type = 'button';
        nextButton.style.cursor = 'pointer';
        nextButton.style.pointerEvents = 'auto';
        nextButton.style.zIndex = '2002';
        
        nextButton.onclick = null;
        nextButton.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            nextTutorialStep();
            return false;
        }, true);
    }

    // Set up overlay click handler (only for clicks outside tooltip)
    if (step.target) {
        const targetElement = document.querySelector(step.target);
        if (targetElement) {
            targetElement.classList.add('tutorial-highlight');
            positionTooltip(tooltip, targetElement, step.position);
        } else {
            positionTooltip(tooltip, null, 'center');
        }
    } else {
        positionTooltip(tooltip, null, 'center');
    }
    
    // Overlay click handler - only trigger if clicking directly on overlay, not tooltip
    overlay.addEventListener('click', (e) => {
        // Don't interfere with tooltip clicks
        if (e.target.closest('.tutorial-tooltip')) {
            return;
        }
        // Only proceed if clicking directly on overlay
        if (e.target === overlay) {
            nextTutorialStep();
        }
    }, false); // Use bubble phase so tooltip clicks can stop it
}

    function positionTooltip(tooltip, targetElement, position) {
    if (!targetElement || position === 'center') {
        tooltip.style.position = 'fixed';
        tooltip.style.top = '50%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        return;
    }

    const rect = targetElement.getBoundingClientRect();
    tooltip.style.position = 'fixed';

    switch (position) {
        case 'top':
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.top = `${rect.top - 20}px`;
            tooltip.style.transform = 'translate(-50%, -100%)';
            break;
        case 'bottom':
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.top = `${rect.bottom + 20}px`;
            tooltip.style.transform = 'translateX(-50%)';
            break;
        case 'left':
            tooltip.style.left = `${rect.left - 20}px`;
            tooltip.style.top = `${rect.top + rect.height / 2}px`;
            tooltip.style.transform = 'translate(-100%, -50%)';
            break;
        case 'right':
            tooltip.style.left = `${rect.right + 20}px`;
            tooltip.style.top = `${rect.top + rect.height / 2}px`;
            tooltip.style.transform = 'translateY(-50%)';
            break;
    }
}

    function nextTutorialStep() {
    const currentStep = tutorialState.steps[tutorialState.currentStep];
    
    removeTutorialHighlight();
    removeTutorialOverlay();

    if (currentStep.waitForConversation) {
        return;
    }

    const nextIndex = tutorialState.currentStep + 1;
    if (nextIndex < tutorialState.steps.length) {
        setTimeout(() => showTutorialStep(nextIndex), 300);
    } else {
        completeTutorial();
    }
}

    function skipTutorial() {
    if (confirm('Skip the tutorial? You can access help anytime from the settings menu.')) {
        removeTutorialHighlight();
        removeTutorialOverlay();
        tutorialState.completed = true;
        tutorialState.enabled = false;
        saveTutorialState();
    }
}

    function completeTutorial() {
    removeTutorialHighlight();
    removeTutorialOverlay();
    tutorialState.completed = true;
    saveTutorialState();
    
    showContextualTip('Tutorial Complete!', 'You can access help anytime from the ⚙️ settings menu.', 'success');
}

    function removeTutorialOverlay() {
    const overlay = document.getElementById('tutorialOverlay');
    if (overlay) {
        overlay.remove();
    }
}

    function removeTutorialHighlight() {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
    });
}

    function saveTutorialState() {
    localStorage.setItem('agencyChaosTutorial', JSON.stringify({
        completed: tutorialState.completed,
        enabled: tutorialState.enabled,
        currentStep: tutorialState.currentStep
    }));
}

    function showContextualTip(title, message, type = 'info', duration = 4000) {
    const tip = document.createElement('div');
    tip.className = `contextual-tip ${type}`;
    tip.innerHTML = `
        <div class="tip-header">
            <strong>${title}</strong>
            <button class="tip-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="tip-body">${message}</div>
    `;
    
    document.body.appendChild(tip);
    
    setTimeout(() => {
        tip.classList.add('tip-show');
    }, 10);
    
    if (duration > 0) {
        setTimeout(() => {
            tip.classList.remove('tip-show');
            setTimeout(() => tip.remove(), 300);
        }, duration);
    }
}

    function checkForContextualTips() {
        if (window.tutorialState.completed && window.tutorialState.enabled) {
            if (window.GameState.money < 1000 && window.GameState.money > -1000) {
                showContextualTip('💰 Low Cash Warning', 'You\'re running low on money. Consider finishing projects or taking on quick work.', 'warning', 5000);
            }
            
            if (window.GameState.teamMorale < 40) {
                showContextualTip('😰 Morale Crisis', 'Team morale is very low. Give them a break or reassign work to prevent quits.', 'warning', 5000);
            }
            
            const projectsWithoutTeam = window.GameState.projects.filter(p => 
                p.status !== 'complete' && 
                !window.GameState.team.some(m => m.currentAssignment === p.id)
            );
            
            if (projectsWithoutTeam.length > 0) {
                showContextualTip('⚠️ Unassigned Projects', `${projectsWithoutTeam.length} project(s) have no team assigned. They won\'t make progress!`, 'warning', 5000);
            }
        }
    }

    function resumeTutorialAfterConversation() {
        const step = tutorialState.steps[tutorialState.currentStep];
        if (step && step.waitForConversation && window.currentConversation === null) {
            setTimeout(() => {
                showTutorialStep(tutorialState.currentStep + 1);
            }, 500);
        }
    }

    function setTutorialEnabled(enabled) {
        tutorialState.enabled = enabled;
        saveTutorialState();
    }

    return {
        getTutorialState: () => tutorialState,
        setTutorialEnabled,
        initTutorial,
        showTutorialStep,
        positionTooltip,
        nextTutorialStep,
        skipTutorial,
        completeTutorial,
        removeTutorialOverlay,
        removeTutorialHighlight,
        saveTutorialState,
        showContextualTip,
        checkForContextualTips,
        resumeTutorialAfterConversation
    };
})();

// Expose on window for backward compatibility
Object.defineProperty(window, 'tutorialState', {
    get: () => TutorialModule.getTutorialState()
});
window.TutorialModule = TutorialModule;
window.initTutorial = TutorialModule.initTutorial;
window.showTutorialStep = TutorialModule.showTutorialStep;
window.positionTooltip = TutorialModule.positionTooltip;
window.nextTutorialStep = TutorialModule.nextTutorialStep;
window.skipTutorial = TutorialModule.skipTutorial;
window.completeTutorial = TutorialModule.completeTutorial;
window.removeTutorialOverlay = TutorialModule.removeTutorialOverlay;
window.removeTutorialHighlight = TutorialModule.removeTutorialHighlight;
window.saveTutorialState = TutorialModule.saveTutorialState;
window.showContextualTip = TutorialModule.showContextualTip;
window.checkForContextualTips = TutorialModule.checkForContextualTips;
window.resumeTutorialAfterConversation = TutorialModule.resumeTutorialAfterConversation;

