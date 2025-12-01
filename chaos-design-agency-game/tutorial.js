// Tutorial System

let tutorialState = {
    enabled: true,
    completed: false,
    currentStep: 0,
    steps: [
        {
            id: 'welcome',
            title: 'Welcome to Agency Chaos Simulator!',
            message: 'You're running a small design agency. Survive 12 weeks by managing projects, keeping clients happy, and maintaining team morale.',
            target: null,
            position: 'center'
        },
        {
            id: 'resources',
            title: 'Your Resources',
            message: 'Keep an eye on Money (don't go bankrupt!), Team Morale (happy team = better work), and Client Satisfaction (determines payment).',
            target: '.resources',
            position: 'bottom'
        },
        {
            id: 'projects',
            title: 'Active Projects',
            message: 'Each project has progress, deadlines, and satisfaction. Projects without teams won't make progress!',
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
            message: 'Let\'s advance to Day 1 to get your first client message. Click "Advance Day" when ready.',
            target: '#advanceDayBtn',
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
            message: 'Use "Advance Day" to move forward. Each week costs money in payroll. Watch for deadline warnings!',
            target: '#advanceDayBtn',
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
    const isNewGame = GameState.currentWeek === 1 && GameState.currentDay === 1;
    
    // For new games (Week 1 Day 1), ALWAYS enable tutorial and reset state
    if (isNewGame) {
        tutorialState.enabled = true;
        tutorialState.completed = false;
        tutorialState.currentStep = 0;
        saveTutorialState(); // Save immediately to override any old disabled state
    } else if (savedTutorialState) {
        // For existing games, load saved state
        const saved = JSON.parse(savedTutorialState);
        tutorialState.completed = saved.completed || false;
        tutorialState.enabled = saved.enabled !== undefined ? saved.enabled : true; // Default to enabled if not set
        tutorialState.currentStep = saved.currentStep || 0;
    } else {
        // No saved state - default to enabled
        tutorialState.enabled = true;
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
            <button class="tutorial-skip" onclick="skipTutorial()">Skip Tutorial</button>
        </div>
        <div class="tutorial-body">
            <p>${step.message}</p>
        </div>
        <div class="tutorial-footer">
            <span class="tutorial-progress">Step ${stepIndex + 1} of ${tutorialState.steps.length}</span>
            ${stepIndex < tutorialState.steps.length - 1 
                ? `<button class="tutorial-next" onclick="nextTutorialStep()">Next</button>`
                : `<button class="tutorial-next" onclick="nextTutorialStep()">Got it!</button>`
            }
        </div>
    `;

    overlay.appendChild(tooltip);
    document.body.appendChild(overlay);

    if (step.target) {
        const targetElement = document.querySelector(step.target);
        if (targetElement) {
            targetElement.classList.add('tutorial-highlight');
            positionTooltip(tooltip, targetElement, step.position);
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    nextTutorialStep();
                }
            });
        } else {
            positionTooltip(tooltip, null, 'center');
        }
    } else {
        positionTooltip(tooltip, null, 'center');
    }
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
    if (tutorialState.completed && tutorialState.enabled) {
        if (GameState.money < 1000 && GameState.money > -1000) {
            showContextualTip('💰 Low Cash Warning', 'You\'re running low on money. Consider finishing projects or taking on quick work.', 'warning', 5000);
        }
        
        if (GameState.teamMorale < 40) {
            showContextualTip('😰 Morale Crisis', 'Team morale is very low. Give them a break or reassign work to prevent quits.', 'warning', 5000);
        }
        
        const projectsWithoutTeam = GameState.projects.filter(p => 
            p.status !== 'complete' && 
            !GameState.team.some(m => m.currentAssignment === p.id)
        );
        
        if (projectsWithoutTeam.length > 0) {
            showContextualTip('⚠️ Unassigned Projects', `${projectsWithoutTeam.length} project(s) have no team assigned. They won't make progress!`, 'warning', 5000);
        }
    }
}

function resumeTutorialAfterConversation() {
    const step = tutorialState.steps[tutorialState.currentStep];
    if (step && step.waitForConversation && currentConversation === null) {
        setTimeout(() => {
            showTutorialStep(tutorialState.currentStep + 1);
        }, 500);
    }
}

